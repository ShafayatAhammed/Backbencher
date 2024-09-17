import transporter from "./transporter.js";

const emailOtpSender = async (recipientName, recipientAddress, otpCode) => {
  try {
    await transporter.sendMail({
      from: {
        name: "Martina",
        address: process.env.APP_GMAIL,
      },
      to: recipientAddress,
      subject: "Your One Time OTP Code",
      html: `<b>Hi ${recipientName}! Thanks For Stay With Martina. Below Is Your One Time Otp Code, That Will Expire In Next 5 Minutes. Enter The Otp Code In Martina. The Otp Code : ${otpCode}</b>`,
    });
  } catch (err) {
    throw err;
  }
};

export default emailOtpSender;
