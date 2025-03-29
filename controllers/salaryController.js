const express = require("express");
const Razorpay = require("razorpay");
const Teacher = require("../models/Teacher");
const BalanceHistory = require("../models/BalanceHistory");
const AdminPaymentHistory = require("../models/AdminPaymentHistory");
const nodemailer = require("nodemailer");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS  // App password (not your personal password)
  }
});

// ✅ Fetch All Teachers' Balances (For Admin Panel)
exports.getTeachersBalance = async (req, res) => {
  try {
    const teachers = await Teacher.find({}, "name username email balance accountNo ifscCode");
    res.json({ success: true, teachers });
  } catch (error) {
    console.error("❌ Error fetching teacher balances:", error.message);
    res.status(500).json({ error: "Error fetching teacher balances", details: error.message });
  }
};

// ✅ Pay Salary to Teachers (All or Selected)
exports.paySalary = async (req, res) => {
  try {
    const { selectedTeachers } = req.body;
    const adminId = req.adminId; // Extract adminId from auth middleware

    if (!adminId) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Fetch teachers based on selection
    const teachers = selectedTeachers?.length
      ? await Teacher.find({ _id: { $in: selectedTeachers }, balance: { $gt: 0 } })
      : await Teacher.find({ balance: { $gt: 0 } });

    if (!teachers.length) {
      return res.status(400).json({ message: "No teachers found with pending balance." });
    }

    let eligibleTeachers = [];
    let ineligibleTeachers = [];

    for (const teacher of teachers) {
      if (teacher.accountNo && teacher.ifscCode) {
        eligibleTeachers.push(teacher);
      } else {
        ineligibleTeachers.push(teacher);
        
        // ❌ Send Email Notification to Update Bank Details
        const emailContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #D9534F;">Salary Payment Failed</h2>
            <p>Dear <b>${teacher.name}</b>,</p>
            <p>We attempted to process your salary payment, but unfortunately, we couldn't proceed because your bank account details are missing.</p>
            <p>Please update your account number and IFSC code in your profile to receive your salary.</p>
            <p>If you have any questions, feel free to contact the admin.</p>
            <p>Best Regards,</p>
            <p><b>EduNest Team</b></p>
          </div>
        `;

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: teacher.email,
          subject: "Salary Payment Failed - Update Bank Details",
          html: emailContent,
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`📩 Email sent to ${teacher.email}: Update your bank details`);
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${teacher.email}:`, emailError);
        }
      }
    }

    if (!eligibleTeachers.length) {
      return res.status(400).json({ message: "No eligible teachers found with valid bank details." });
    }

    const totalAmount = eligibleTeachers.reduce((sum, teacher) => sum + teacher.balance, 0);

    // ✅ Create Razorpay Payment Order for Eligible Teachers
    const order = await razorpay.orders.create({
      amount: totalAmount * 100, // Convert to paisa
      currency: "INR",
      receipt: `salary_${Date.now()}`,
    });

    res.json({
      success: true,
      message: "Salary payment initiated. Emails sent to teachers with missing bank details.",
      order,
      eligibleTeachers,
      ineligibleTeachers,
    });

  } catch (error) {
    console.error("❌ Error creating salary payment order:", error.message);
    res.status(500).json({ error: "Error processing salary payment", details: error.message });
  }
};

// ✅ Verify Salary Payment & Update Balance
exports.verifySalaryPayment = async (req, res) => {
  try {
    const { order_id, payment_id, signature, teachers } = req.body;
    const adminId = req.adminId;

    if (!order_id || !payment_id || !signature || !teachers.length) {
      return res.status(400).json({ message: "Invalid request. Missing required fields." });
    }

    // Verify Razorpay Signature
    const generatedSignature = require("crypto")
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(order_id + "|" + payment_id)
      .digest("hex");

    if (generatedSignature !== signature) {
      return res.status(400).json({ message: "Payment verification failed. Signature mismatch." });
    }

    let paymentData = [];

    // Process each teacher's payment
    for (const teacherId of teachers) {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) continue;

      const paidAmount = teacher.balance;
      const lastThreeDigits = teacher.accountNo.toString().slice(-3);
      const reason = `Salary payment to account no. ******${lastThreeDigits}`;

      // Update BalanceHistory
      await BalanceHistory.findOneAndUpdate(
        { teacherId },
        { $push: { historySalary: { salary: paidAmount, reason } } },
        { upsert: true, new: true }
      );

      // Reset balance to 0
      await Teacher.findByIdAndUpdate(teacherId, { balance: 0 });

      // Store payment data
      paymentData.push({
        teacherId,
        name: teacher.name,
        username: teacher.username,
        email: teacher.email,
        paidAmount,
      });

      // Send Salary Payment Email
      const emailContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #2E86C1;">Salary Payment Confirmation</h2>
          <p>Dear <b>${teacher.name}</b>,</p>
          <p>We are pleased to inform you that your salary has been successfully credited.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><b>Amount Paid:</b></td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #28a745;">₹${paidAmount}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><b>Account Number:</b></td>
              <td style="padding: 8px; border: 1px solid #ddd;">******${lastThreeDigits}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><b>Payment Date:</b></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
          <p style="margin-top: 15px;">If you have any questions, please contact the admin.</p>
          <p>Best Regards,</p>
          <p><b>EduNest Team</b></p>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: teacher.email,
        subject: "Salary Payment Confirmation",
        html: emailContent,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Salary email sent to ${teacher.email}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${teacher.email}:`, error);
      }
      
    }

    // Store in Admin Payment History
    await AdminPaymentHistory.findOneAndUpdate(
      {},
      { $push: { payments: { amount: paymentData.reduce((sum, t) => sum + t.paidAmount, 0), teachersPaid: paymentData } } },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Salaries paid successfully, and emails sent!", paymentData });

  } catch (error) {
    console.error("❌ Error verifying salary payment:", error.message);
    res.status(500).json({ error: "Error verifying salary payment", details: error.message });
  }
};


// ✅ Get Admin Salary Payment History
exports.getAdminPaymentHistory = async (req, res) => {
  try {
    const history = await AdminPaymentHistory.findOne({});
    res.json({ success: true, history });
  } catch (error) {
    console.error("❌ Error fetching admin payment history:", error.message);
    res.status(500).json({ error: "Error fetching admin payment history", details: error.message });
  }
};

// ✅ Get Total Pending Salary for All Teachers
exports.getTotalPendingSalary = async (req, res) => {
    try {
        console.log("Fetching pending salaries...");

        // Fetch each teacher's balance along with their name and email
        const teachersWithBalance = await Teacher.find({}, { name: 1, email: 1, balance: 1 });

        // Log each teacher's pending balance
        teachersWithBalance.forEach(teacher => {
            console.log(`🔹 ${teacher.name} (Email: ${teacher.email}) has pending salary: ₹${teacher.balance}`);
        });

        // Aggregate total salary
        const totalSalary = await Teacher.aggregate([
            { $group: { _id: null, totalAmount: { $sum: "$balance" } } }
        ]);

        // Get total amount or default to 0
        const totalAmount = totalSalary?.[0]?.totalAmount || 0;

        console.log("✅ Total pending salary is:", totalAmount);

        // Format response with required fields
        const teachersData = teachersWithBalance.map(teacher => ({
            name: teacher.name,
            email: teacher.email,
            pendingSalary: teacher.balance
        }));

        res.json({
            success: true,
            totalPendingSalary: totalAmount,
            teachers: teachersData  // Returning formatted teacher data
        });

    } catch (error) {
        console.error("❌ Error fetching total pending salary:", error.message);
        res.status(500).json({
            error: "Error fetching total pending salary",
            details: error.message
        });
    }
};
