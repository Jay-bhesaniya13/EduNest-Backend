const jwt = require("jsonwebtoken");
require("dotenv").config();
const Teacher = require("../models/Teacher");
const Admin=require("../models/Admin")

// Authenticate Student
exports.authenticateStudent = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ error: "Access Denied. No token provided." });

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.studentId = decoded.id; // Attach student ID to request
   console.log("auth:"+req.studentId )
    next();
  } catch (error) {
    console.log()
    res.status(400).json({ error: "Invalid token from student Auth" ,message:error});
  }
};


// Authenticat Teacher
exports.authenticateTeacher = async (req, res, next) => {
  const token = req.header("Authorization");
  
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    console.log("Decode:"+decoded)
    const teacher = await Teacher.findById(decoded.id);
    
    if (!teacher || !teacher.isActive) {
      return res.status(401).json({ error: "Teacher is not exist.(Unauthorized access)" });
    }

    req.teacher = teacher;
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token." });
  }
};


// for authenticate client
exports.authenticateClient = async (req, res, next) => {
  const token = req.header("Authorization");
 
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET_KEY);
    
    const client = await Client.findById(decoded.id);
     if (!client) {
      return res.status(403).json({ error: "Unauthorized. Client not found.bbvj" ,jwt_id:decoded.id,token });
    }
     req.Client = client; // Attach the authenticated client to the request
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};


 exports.authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header("Authorization");
     if (!token) return res.status(401).json({ message: "Access denied. No token provided." });
     const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    
     const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ message: "Invalid token or admin not found." });

    req.admin = admin; // Store admin in request object
    next();
  } catch (error) {
    res.status(401).json({ 
        success: false, 
        message: "Invalid token.", 
        error: error.message || error 
    });
}

};
