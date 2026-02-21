const express = require("express");
const Appointment = require("../models/Appoiment");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Shared transporter for appointment notifications
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// router.post("/book-appointment", async (req, res) => {
//   try {
    // const { patientId, hospitalId, date, time } = req.body;
// 
    // const appointment = new Appointment({
    //   patientId,
    //   hospitalId,
    //   date,
    //   time
    // });
// 
    // await appointment.save();
// 
    // Get hospital email
    // const patient = await User.findById(patientId);
    // const hospital = await User.findById(hospitalId);
// 
// 
    
    // demailer.createTransport({
    //   service: "gmail",
    //   auth: {
        // user: process.env.EMAIL_USER,
        // pass: process.env.EMAIL_PASS
    //   }
    // });
// 
    
    // await transporter.sendMail({
    //   from: process.env.EMAIL_USER,
    //   to: hospital.email,
    //   subject: "New Appointment Booked",
    //   text: `New appointment booked on ${date} at ${time}`
    // });
// 
    // PDF Code Start............
    // Create uploads folder if not exists
// const uploadPath = path.join(__dirname, "../uploads");
// if (!fs.existsSync(uploadPath)) {
//   fs.mkdirSync(uploadPath);
// }
// 
// Create PDF
//   const doc = new PDFDocument();
//   const filePath = path.join(uploadPath, `appointment-${appointment._id}.pdf`);
//   
//   doc.pipe(fs.createWriteStream(filePath));
//   
//   doc.fontSize(20).text("Appointment Confirmation", { align: "center" });
//   doc.moveDown();
//   doc.fontSize(14).text(`Patient ID: ${patientId}`);
//   doc.text(`Hospital ID: ${hospitalId}`);
//   doc.text(`Date: ${date}`);
//   doc.text(`Time: ${time}`);
//   doc.text("Status: Pending");
//   
//   doc.end();
// Pdf Code End
// 
    // res.json({ message: "Appointment booked & email sent" });
// 
//   } catch (error) {
    // console.log(error);
    // res.status(500).json({ message: "Server error" });
//   }
// });
// 
// module.exports = router;


router.post("/book-appointment", async (req, res) => {
  try {
    const { patientId, hospitalId, date, time } = req.body;

    const appointment = new Appointment({
      patientId,
      hospitalId,
      date,
      time
    });

    await appointment.save();

    // Get patient & hospital details
    const patient = await User.findById(patientId);
    const hospital = await User.findById(hospitalId);

    // ===== PDF GENERATE =====
    const uploadPath = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }

    const filePath = path.join(
      uploadPath,
      `appointment-${appointment._id}.pdf`
    );

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text("Appointment Confirmation", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Patient Name: ${patient.name}`);
    doc.text(`Hospital Name: ${hospital.name}`);
    doc.text(`Date: ${date}`);
    doc.text(`Time: ${time}`);
    doc.text("Status: Pending");

    doc.end();

    // ===== EMAIL SEND WITH PDF =====
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: [patient.email, hospital.email], // dono ko email
      subject: "Appointment Confirmation",
      text: `Appointment booked on ${date} at ${time}`,
      attachments: [
        {
          filename: `appointment-${appointment._id}.pdf`,
          path: filePath
        }
      ]
    });

    res.json({
      message: "Appointment booked, email sent with PDF"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


// GET all appointments (admin)
router.get('/appointments', async (req, res) => {
  try {
    const appts = await Appointment.find().populate('patientId', 'name email').populate('hospitalId', 'name email');
    res.json(appts);
  } catch (err) {
    console.error('Get appointments error:', err);
    res.status(500).json({ message: 'Error fetching appointments' });
  }
});

// GET appointments for a specific hospital
router.get('/appointments/hospital/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const appts = await Appointment.find({ hospitalId }).populate('patientId', 'name email').populate('hospitalId', 'name email');
    res.json(appts);
  } catch (err) {
    console.error('Get hospital appointments error:', err);
    res.status(500).json({ message: 'Error fetching hospital appointments' });
  }
});

// Update appointment status
router.put('/appointments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });

    const appt = await Appointment.findById(id).populate('patientId', 'name email').populate('hospitalId', 'name email');
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    appt.status = status;
    await appt.save();

    // notify patient and hospital
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: [appt.patientId.email, appt.hospitalId.email],
        subject: `Appointment ${status}`,
        html: `<p>Your appointment scheduled on <strong>${appt.date}</strong> at <strong>${appt.time}</strong> is now <strong>${status}</strong>.</p>`
      });
    } catch (emailErr) {
      console.error('Appointment status email failed:', emailErr);
    }

    res.json({ message: 'Appointment status updated', appointment: appt });
  } catch (err) {
    console.error('Update appointment status error:', err);
    res.status(500).json({ message: 'Error updating appointment status' });
  }
});

 module.exports = router;