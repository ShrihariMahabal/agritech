let color = "pink";
let moisture = 0;
const receiveMoistureData = (req, res) => {
  if (req.is("application/json")) {
    try {
      const data = req.body;
      const moistureLevel = data.moisture;
      moisture = moistureLevel;
      if (moistureLevel < 10) {
        color = "orange";
      } else if (10 <= moistureLevel < 50) {
        color = "green";
      } else {
        color = "blue";
      }
      // Here you would typically perform your backend logic,
      // such as saving the data to a database, triggering notifications, etc.

      res.status(200).json({ message: "Moisture data received successfully!" });
    } catch (error) {
      res.status(400).json({ error: "Invalid JSON data" });
    }
  } else {
    res.status(400).json({ error: "Request must be JSON" });
  }
};
const giveColor = (req, res) => {
  try {
    res.status(200).json({
      color: color,
      moisture: moisture,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
};

module.exports = {
  giveColor,
  receiveMoistureData,
};
