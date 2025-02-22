const express = require("express");
const {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");

const router = express.Router();

router.post("/", createTransaction);
router.get("/", getAllTransactions);
router.get("/:transactionId", getTransactionById);
router.put("/:transactionId", updateTransaction);
router.delete("/:transactionId", deleteTransaction);

module.exports = router;
