const express = require("express");
const {
  registerClient,
  loginClient,
  getClientProfile,
  updateClientProfile,
  deleteClientAccount,
  authenticateClient,
} = require("../controllers/clientController");

const router = express.Router();

router.post("/register", registerClient);
router.post("/login", loginClient);
router.get("/profile", authenticateClient, getClientProfile);
router.put("/profile", authenticateClient, updateClientProfile);
router.delete("/delete", authenticateClient, deleteClientAccount);

module.exports = router;
