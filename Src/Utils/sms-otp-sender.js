import { twilioClient } from "../index.js";

const smsOtpSender = async (recipientName, recipientNumber, otpCode) => {
  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: recipientNumber,
      body: `Hi ${recipientName}! Here is your one time otp code : ${otpCode}`,
    });
  } catch (err) {
    throw err;
  }
};

export default smsOtpSender;
