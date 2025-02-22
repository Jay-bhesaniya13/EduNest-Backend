const Transaction = require("../models/Transaction");

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { studentId, amount, transactionDate, status } = req.body;
    const newTransaction = new Transaction({
      studentId,
      amount,
      transactionDate,
      status,
    });
    await newTransaction.save();
    res.status(201).json({ message: "Transaction created successfully", transaction: newTransaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find();
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update transaction details
exports.updateTransaction = async (req, res) => {
  try {
    const updatedTransaction = await Transaction.findByIdAndUpdate(req.params.transactionId, req.body, {
      new: true,
    });
    if (!updatedTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.status(200).json({ message: "Transaction updated successfully", transaction: updatedTransaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark transaction as inactive instead of deleting
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    transaction.isActive = false;
    await transaction.save();
    res.status(200).json({ message: "Transaction marked as inactive" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
