const twilio = require('twilio');
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

async function sendOTP(phone, otp) {
  try {

    const message = await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
  }
}

module.exports = { sendOTP };