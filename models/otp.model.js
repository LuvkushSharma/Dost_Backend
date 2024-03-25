const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
  },
  otp: {
    type: String,
    required: [true, "OTP is required"],
  },
  otpExpiration: {
    type: Date,
    required: [true, "ExpiresAt is required"],
  },
});

const OTP = mongoose.model("OTP", otpSchema);

module.exports = OTP;
