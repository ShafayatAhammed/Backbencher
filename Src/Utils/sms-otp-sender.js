import { twilioClient } from "../index.js";

const smsOtpSender = async (recipientName, recipientNumber, otpCode) => {
  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: recipientNumber,
      body: `Hi ${recipientName}! Here is your one time otp code : ${otpCode}`,
    });

    console.log("One time otp code has sent successfully.");
  } catch (err) {
    console.log("One time otp code send unsuccessful!\n");
    throw new Error(err);
  }
};

export default smsOtpSender;
