const express = require("express");
const router = express.Router();
const Hospital = require("../models/hospital");
const nodemailer = require("nodemailer");
require("dotenv").config();


// ----------------- EMAIL TRANSPORTER -----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


// =====================================================
// 1️⃣ ADD HOSPITAL (USER SIDE)
// =====================================================
router.post("/add-hospital", async (req, res) => {
  try {
    const {
      ownerId,
      hospitalName,
      ownerName,
      city,
      contactNumber,
      officialEmail,
      identificationNumber,
      about
    } = req.body;

    const hospital = new Hospital({
      hospitalId: "HOSP" + Math.floor(100000 + Math.random() * 900000), // random 6 digit
      ownerId,
      hospitalName,
      ownerName,
      city,
      contactNumber,
      officialEmail,
      identificationNumber,
      about,
      status: "Pending"
    });

    await hospital.save();

    // Send Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: officialEmail,
      subject: "Hospital Registration Submitted",
      text: "Your hospital profile has been submitted and is pending approval."
    });

    res.status(201).json({
      message: "Hospital added successfully (Pending Approval)",
      hospital
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error adding hospital" });
  }
});


// =====================================================
// 2️⃣ GET ALL APPROVED HOSPITALS
// =====================================================
router.get("/all-hospitals", async (req, res) => {
  try {
    const hospitals = await Hospital.find({ status: "Approved" });
    res.json(hospitals);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching hospitals" });
  }
});




// =====================================================
// 3️⃣ GET ALL PENDING HOSPITALS (ADMIN)
// =====================================================
router.get("/pending-hospitals", async (req, res) => {
  try {
    const hospitals = await Hospital.find({ status: "Pending" });

    res.json({
      totalPending: hospitals.length,
      hospitals
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching pending hospitals" });
  }
});



// =====================================================
// 3️⃣ GET SINGLE HOSPITAL BY MONGODB _id
// =====================================================
router.get("/hospital/:id", async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    res.json(hospital);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching hospital" });
  }
});


// =====================================================
// 4️⃣ UPDATE HOSPITAL STATUS (ADMIN)
// =====================================================
router.put("/update-hospital-status/:id", async (req, res) => {
  try {
    // make sure body is parsed and contains status
    if (!req.body) {
      console.log('Empty request body for status update');
      return res.status(400).json({ message: "Request body is missing" });
    }

    const status = req.body.status;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    // Send Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: hospital.officialEmail,
      subject: "Hospital Status Update",
      text: `Your hospital status is now: ${status}`
    });

    res.json({
      message: `Hospital status updated to ${status}`,
      hospital
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error updating hospital status" });
  }
});


// =====================================================
// 6️⃣ HOSPITAL COUNTS (ADMIN DASHBOARD)
// =====================================================
router.get("/hospital-counts", async (req, res) => {
  try {
    const total = await Hospital.countDocuments();
    const approved = await Hospital.countDocuments({ status: "Approved" });
    const pending = await Hospital.countDocuments({ status: "Pending" });
    const rejected = await Hospital.countDocuments({ status: "Rejected" });

    res.json({
      total,
      approved,
      pending,
      rejected
    });

  } catch (error) {
    res.status(500).json({ message: "Error getting counts" });
  }
});


module.exports = router;
