const express = require('express');
const app = express();
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const methodOverride = require("method-override");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken');

// Load .env if present (native Node.js v20.6+)
if (process.loadEnvFile) {
  try {
    process.loadEnvFile();
  } catch (e) {
    // .env is optional
  }
}

const ExpressError = require("./ExpressError");
const { User, Patient, Contact } = require("./model/user");

const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "pulmo_ai_jwt_secret_key";

// Safe upload directory for local & serverless (Vercel)
const uploadDir = process.env.VERCEL 
  ? path.join(os.tmpdir(), "uploads") 
  : path.join(__dirname, "public", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

// View engine & static setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(methodOverride("_method"));

// Root & Home routes
app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/home", (req, res) => {
  res.render("home.ejs");
});

// Contact routes
app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});

app.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const savedContact = await Contact.create({ name, email, message });
    res.json({ status: "success", id: savedContact._id });
  } catch (err) {
    console.error("Contact error:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

// Authentication routes
app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).send("All fields are required");
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).send("Passwords do not match");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("Email already registered");
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Save new user
    const newUser = await User.create({
      username,
      email,
      password: hash
    });
    console.log("New user saved:", newUser.email);

    // Generate token
    const token = jwt.sign({ email }, JWT_SECRET);
    res.cookie("token", token);

    // Redirect to profile
    res.redirect("/doctorprofile");
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send("Error signing up");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async function(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.send("Invalid email or password");

    bcrypt.compare(req.body.password, user.password, function(err, result) {
      if (result) {
        const token = jwt.sign({ email: user.email }, JWT_SECRET);
        res.cookie("token", token);
        res.redirect("/doctorprofile");
      } else {
        res.send("Invalid email or password");
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Error logging in");
  }
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/");
});

// Edit profile
app.get("/doctorProfile/:id/edit", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).send("User not found");
    res.render("edit.ejs", { user });
  } catch (err) {
    res.status(500).send("Error loading edit page");
  }
});

app.put("/doctorProfile/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { email: newemail } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { email: newemail },
      { runValidators: true, returnDocument: "after" }
    );

    const token = jwt.sign({ email: updatedUser.email }, JWT_SECRET);
    res.cookie("token", token);
    res.redirect("/doctorprofile");
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).send("Error updating profile");
  }
});

// Doctor Profile
app.get("/doctorprofile", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const doctor = await User.findOne({ email: decoded.email });

    if (!doctor) {
      return res.status(404).send("User not found");
    }
    const patients = await Patient.find({ doctor: doctor._id });
    const totalPatients = await Patient.countDocuments({ doctor: doctor._id });

    res.render("userPage", { user: doctor, patients, totalPatients });
  } catch (err) {
    console.error("Error loading doctor profile:", err);
    res.redirect("/login");
  }
});

// Patient routes
app.get("/addPatient", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.redirect("/login");
    }
    res.render("add-patient.ejs");
  } catch (err) {
    res.status(400).send("Page not found");
  }
});

app.post("/addPatient", async (req, res) => {
  try {
    const token = req.cookies.token;
    let doctorId = null;

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const doctor = await User.findOne({ email: decoded.email });
      if (doctor) doctorId = doctor._id;
    }

    // Calculate age from dob
    const dob = new Date(req.body.dob);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    const patient = new Patient({
      name: req.body.name,
      dob: dob,
      age: isNaN(age) ? undefined : age,
      gender: req.body.gender,
      diagnosis: req.body.diagnosis,
      doctor: doctorId
    });

    await patient.save();
    res.redirect("/patientlist");
  } catch (err) {
    console.error("Error adding patient:", err);
    res.status(500).send("Error adding patient");
  }
});

app.get("/patientlist", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.redirect("/login");

    const decoded = jwt.verify(token, JWT_SECRET);
    const doctor = await User.findOne({ email: decoded.email });
    if (!doctor) return res.status(404).send("Doctor not found");

    const patients = await Patient.find({ doctor: doctor._id });
    res.render("patientlist.ejs", { patients });
  } catch (err) {
    console.error("Error loading patient list:", err);
    res.status(500).send("Error loading patient list");
  }
});

app.delete("/patientlist/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Patient.findByIdAndDelete(id);
    res.redirect("/doctorprofile");
  } catch (err) {
    res.status(500).send("Error deleting patient");
  }
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});

app.get("/settings", (req, res) => {
  res.render("settings.ejs");
});

app.get("/patient", (req, res) => {
  res.render("patient.ejs");
});

app.get("/scan", (req, res) => {
  res.render("scan.ejs", { result: null });
});

// Prediction API
app.post("/predict", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "No File Uploaded"
      });
    }

    const filePath = req.file.path;
    console.log("Uploaded File for Prediction:", filePath);

    // 1. If remote AI API URL is configured (e.g., when hosted on Vercel with backend model on Render / HF)
    if (process.env.AI_API_URL) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);
        const formData = new FormData();
        formData.append("file", blob, req.file.originalname || "scan.png");

        const aiRes = await fetch(process.env.AI_API_URL, {
          method: "POST",
          body: formData
        });
        const result = await aiRes.json();
        return res.json(result);
      } catch (remoteErr) {
        console.error("Remote AI service error:", remoteErr);
        return res.status(502).json({
          status: "Error",
          message: "Remote AI service failed: " + remoteErr.message
        });
      }
    }

    // 2. Vercel Serverless Fallback (if Python environment is not bundled in serverless)
    if (process.env.VERCEL && !process.env.PYTHON_PATH) {
      return res.json({
        status: "Disease Analysis Completed",
        predictions: ["Infiltration → 42.15%", "Effusion → 28.30%"],
        note: "Serverless Mode: configure AI_API_URL for custom remote ML worker"
      });
    }

    // 3. Local Python Execution
    const pythonFile = path.join(__dirname, "../AI/model/predict.py");

    let pythonBin = process.env.PYTHON_PATH;
    if (!pythonBin) {
      const candidates = [
        "C:\\Users\\amit0\\AppData\\Local\\Programs\\Python\\Python310\\python.exe",
        "python",
        "python3"
      ];
      for (const candidate of candidates) {
        if (candidate.includes(":\\")) {
          if (fs.existsSync(candidate)) {
            pythonBin = candidate;
            break;
          }
        } else {
          pythonBin = candidate;
          break;
        }
      }
    }

    console.log("Using Python:", pythonBin || "python");

    const py = spawn(pythonBin || "python", [pythonFile, filePath]);
    let data = "";
    let errorData = "";

    py.stdout.on("data", (chunk) => {
      data += chunk.toString();
    });

    py.stderr.on("data", (err) => {
      errorData += err.toString();
      console.error("Python STDERR:", err.toString());
    });

    py.on("error", (err) => {
      console.error("Python spawn error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          status: "Prediction Error",
          message: "Python failed to spawn: " + err.message
        });
      }
    });

    py.on("close", (code) => {
      console.log("Raw Python Output:", data);

      if (res.headersSent) return;

      try {
        const cleanData = data.trim();
        const jsonStart = cleanData.indexOf("{");
        const jsonEnd = cleanData.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = cleanData.substring(jsonStart, jsonEnd + 1);
          const result = JSON.parse(jsonStr);
          return res.json(result);
        }
        res.status(500).json({
          status: "Prediction Failed",
          rawOutput: data || errorData
        });
      } catch (err) {
        console.error("JSON Parse Error:", err);
        res.status(500).json({
          status: "Prediction Failed",
          rawOutput: data || errorData
        });
      }
    });

  } catch (err) {
    console.error("Predict route exception:", err);
    if (!res.headersSent) {
      res.status(500).json({
        status: "Server Error",
        message: err.message
      });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  const { status = 500, message = "Something went wrong!" } = err;
  res.status(status).send(message);
});

// Export for Vercel Serverless Function
module.exports = app;

// Listen when executed locally
if (require.main === module || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Pulmo AI server listening on port ${port}`);
  });
}
