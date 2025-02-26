const Client = require("../models/Client");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET;

// 🔹 Register a new client
exports.registerClient = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({ error: "Email already exists." });
    }

    const newClient = new Client({ name, email, password });
    await newClient.save();

    res.status(201).json({ message: "Client registered successfully." ,client:newClient});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Client login
exports.loginClient = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await client.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign({ id: client._id, email: client.email }, SECRET_KEY, {
      expiresIn: "7d",
    });

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Get client profile (Self-authenticated)
exports.getClientProfile = async (req, res) => {
  try {
    const clientId = req.client.id;
    const client = await Client.findById(clientId).select("-password");

    if (!client) {
      return res.status(404).json({ error: "Client not found." });
    }

    res.status(200).json({ client });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Update client profile (Self-authenticated)
exports.updateClientProfile = async (req, res) => {
  try {
    const clientId = req.client.id;
    const { name, email, password } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found." });
    }

    if (name) client.name = name;
    if (email) client.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      client.password = await bcrypt.hash(password, salt);
    }

    await client.save();
    res.status(200).json({ message: "Client profile updated successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Delete client account (Self-authenticated)
exports.deleteClientAccount = async (req, res) => {
  try {
    const clientId = req.client.id;

    const deletedClient = await Client.findByIdAndDelete(clientId);
    if (!deletedClient) {
      return res.status(404).json({ error: "Client not found." });
    }

    res.status(200).json({ message: "Client account deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Middleware to authenticate Client via JWT
exports.authenticateClient = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET_KEY);
    req.client = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
