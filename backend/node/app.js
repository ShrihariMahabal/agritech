const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const connectDB = require("./services/connect");
dotenv.config();
const app = express();
const url = process.env.MONG_URI;

const port = 8000;

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Middleware
app.use(cors());
app.use(express.json());
const login = require("./routes/login");
app.use("/login", login);
const projects = require("./routes/handleProjects");
app.use("/project", projects);
const refund = require("./routes/handleRefund");
app.use("/refund", refund);
const green = require("./routes/handleGreen");
app.use("/green", green);
// Test Route
app.get("/", (req, res) => {
  res.json({ message: "🚀 Express Server is Running!" });
});

// Start Server
// app.listen(PORT, () => {
//   console.log(`✅ Server running on http://localhost:${PORT}`);
// });
const start = async () => {
  try {
    await connectDB(url);
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Error starting the server:", err.message);
  }
};

start();
