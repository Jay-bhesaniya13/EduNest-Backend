const express = require("express");
const { 
    getTeachersBalance, 
    paySalary, 
    verifySalaryPayment, 
    getAdminPaymentHistory ,
    getTotalPendingSalary
} = require("../controllers/salaryController");
const { authenticateAdmin } = require("../controllers/authController");

const router = express.Router();

// ✅ Fetch all teachers' balances
router.get("/teachers-balance", authenticateAdmin, getTeachersBalance);

// ✅ Create salary payment request (Pay All or Selected Teachers)
router.post("/pay-salary", authenticateAdmin, paySalary);

// ✅ Verify salary payment after successful Razorpay transaction
router.post("/verify-payment", authenticateAdmin, verifySalaryPayment);

// ✅ Get total pending salary for all teachers
router.get("/total-pending-salary", authenticateAdmin , getTotalPendingSalary);


// ✅ Fetch admin's salary payment history
router.get("/admin-payment-history", authenticateAdmin , getAdminPaymentHistory);

module.exports = router;
