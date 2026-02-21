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
      about,
      hospitalLogo
    } = req.body;

    // Validate required fields
    if (!ownerId || !hospitalName || !ownerName || !city || !contactNumber || !officialEmail || !identificationNumber) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const hospital = new Hospital({
      hospitalId: "HOSP" + Math.floor(100000 + Math.random() * 900000),
      ownerId,
      hospitalName,
      hospitalLogo,
      ownerName,
      city,
      contactNumber,
      officialEmail,
      identificationNumber,
      about: about || '',
      status: "Pending"
    });

    await hospital.save();

    // Send Email Confirmation
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: officialEmail,
        subject: "Hospital Registration Submitted - Pending Approval",
        html: `
          <h2>Welcome ${hospitalName}!</h2>
          <p>Your hospital profile has been submitted for verification.</p>
          <p><strong>Status:</strong> Pending Approval</p>
          <p>Our team will review your details and approve your profile within 24-48 hours.</p>
          <p>You will receive an email notification once your profile is approved.</p>
          <p>Best regards,<br/>BookVisit Team</p>
        `
      });
      console.log("Email sent to", officialEmail);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      message: "Hospital added successfully (Pending Approval)",
      hospital
    });

  } catch (error) {
    console.error("Add hospital error:", error);
    res.status(500).json({ message: "Error adding hospital", error: error.message });
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

    if (!status || !['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ message: "Valid status is required (Approved, Rejected, or Pending)" });
    }

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    // Send Email with HTML formatting
    const statusMessages = {
      Approved: {
        subject: "🎉 Your Hospital Profile Has Been Approved!",
        html: `
          <h2>Welcome to BookVisit, ${hospital.hospitalName}!</h2>
          <p>Congratulations! Your hospital profile has been <strong>APPROVED</strong>.</p>
          <p>Your profile is now live and visible to patients on our platform.</p>
          <p><strong>Hospital ID:</strong> ${hospital.hospitalId}</p>
          <p><strong>Next Steps:</strong> Monitor your profile and publish your available appointments.</p>
          <p>Best regards,<br/>BookVisit Team</p>
        `
      },
      Rejected: {
        subject: "Hospital Profile Status Update",
        html: `
          <h2>Profile Review</h2>
          <p>Your hospital profile has been <strong>REJECTED</strong>.</p>
          <p>Please contact our support team for more details or to reapply.</p>
          <p>Support: support@bookvisit.com</p>
        `
      },
      Pending: {
        subject: "Hospital Profile Status Update",
        html: `
          <h2>Status Update</h2>
          <p>Your hospital profile status is <strong>PENDING</strong>.</p>
          <p>We are reviewing your details. You will be notified once a decision is made.</p>
        `
      }
    };

    const emailTemplate = statusMessages[status];
    
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: hospital.officialEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
      console.log("Status update email sent to", hospital.officialEmail);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
      // Don't fail the request if email fails
    }

    res.json({
      message: `Hospital status updated to ${status}`,
      hospital
    });

  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Error updating hospital status", error: error.message });
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
