import transporter from "./transporter.js";

const emailVerificationSender = async (
  recipientName,
  recipientAddress,
  verificationToken
) => {
  try {
    await transporter.sendMail({
      from: {
        name: "Martina",
        address: process.env.APP_GMAIL,
      },
      to: recipientAddress,
      subject: "Your Email Verification Link",
      html: `<b>Hi ${recipientName}! Thanks For Stay With Martina. Here Is Your Email Verification Link, That Will Expire In Next 5 Minutes. Click The Link. The Link : <a href="http://localhost:8000/api/v1/emails/verify-email?emailVerificationToken=${verificationToken}">http://localhost:8000/api/v1/emails/verify-email?emailVerificationToken=${verificationToken}</a></b>`,
    });
    console.log(`Verification token is : ${verificationToken}`);

    console.log("Email verification link has sent successfully.");
  } catch (err) {
    console.log("Email verification link send unsuccessful!\n");
    throw new Error(err);
  }
};

export default emailVerificationSender;
