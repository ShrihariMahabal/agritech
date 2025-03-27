const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const connectDB = require("./services/connect");
const path = require("path");
const fs = require("fs");
dotenv.config();

const app = express();
const url = process.env.MONG_URI;
const port = 8000;

// Create videos directory if it doesn't exist
const videosDir = path.join(__dirname, "backend/node/videos");

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use("/videos", express.static(videosDir)); // Serve static video files

// Routes
const login = require("./routes/login");
const projects = require("./routes/handleProjects");
const refund = require("./routes/handleRefund");
const green = require("./routes/handleGreen");
const videoRoutes = require("./routes/videoRoutes"); // Your existing video routes

app.use("/login", login);
app.use("/project", projects);
app.use("/refund", refund);
app.use("/green", green);
app.use("/videos", videoRoutes); // Mount your existing video routes

const sensor = require("./routes/handleSensor");
app.use("/sensor", sensor);
// Test Route
app.get("/", (req, res) => {
  res.json({ message: "🚀 Express Server is Running!" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle multer errors specifically
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      success: false, 
      message: err.code === 'LIMIT_FILE_SIZE' 
        ? 'File size too large (max 100MB)' 
        : 'File upload error' 
    });
  }
  
  res.status(500).json({ success: false, message: err.message });
});

// Start Server
const start = async () => {
  try {
    await connectDB(url);
    app.listen(port, () => {
      console.log(`✅ Server is running on http://localhost:${port}`);
      console.log(`📁 Videos stored in: ${videosDir}`);
    });
  } catch (err) {
    console.error("Error starting the server:", err.message);
    process.exit(1);
  }
};

start();