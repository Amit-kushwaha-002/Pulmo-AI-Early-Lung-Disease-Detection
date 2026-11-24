const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/authtestapp";

// Cached connection for Serverless environments (e.g. Vercel)
if (mongoose.connection.readyState === 0) {
  mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000
  })
    .then(() => console.log("MongoDB connected successfully to:", MONGO_URI.split("@").pop()))
    .catch(err => console.warn("MongoDB connection warning:", err.message));
}

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

// Patient schema
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  age: { type: Number },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  diagnosis: { type: String },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  scanImage: { type: String }
});

const Patient = mongoose.models.Patient || mongoose.model("Patient", patientSchema);

// Contact Inquiry schema
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.models.Contact || mongoose.model("Contact", contactSchema);

module.exports = { User, Patient, Contact };
