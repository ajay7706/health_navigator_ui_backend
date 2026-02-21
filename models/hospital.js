const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema({
  ownerId: {
    // type: mongoose.Schema.Types.ObjectId,
    // ref: "User",
    type: String ,
    required: true
  },
  hospitalId: {type: String, unique: true},
  hospitalName: { type: String, required: true },
  hospitalLogo: { type: String }, // image path
  ownerName: { type: String, required: true },
  city: { type: String, required: true },
  contactNumber: { type: String, required: true },
  officialEmail: { type: String, required: true },
  identificationNumber: { type: String }, // GST / License
  about: { type: String },

  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  }

}, { timestamps: true });

module.exports = mongoose.model("Hospital", hospitalSchema);