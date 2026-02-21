const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/hospitalDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.get("/", (req, res) => {
  res.send("Hospital Backend Running");
});

const authRoutes = require("./routes/authRoutes");
app.use("/api", authRoutes);

const appointmentRoutes = require("./routes/appointmentRoutes");
app.use("/api", appointmentRoutes);

const hospitalRoutes = require("./routes/hospitalRoutes");
app.use("/api/hospital", hospitalRoutes);

// file upload route
const uploadRoutes = require("./routes/uploadRoutes");
app.use("/api", uploadRoutes);

app.listen( 5000 , () => {
  console.log("Server running on port 5000");
});