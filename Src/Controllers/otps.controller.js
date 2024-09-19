import Otp from "../Models/otps.model.js";
import User from "../Models/users.model.js";
import ApiResponser from "../Utils/api-responser.js";
import generateEmailVerificationToken from "../Utils/email-verification-token-generator.js";
import emailVerificationSender from "../Utils/email-verification-sender.js";
import errorHandler from "../Utils/error-handler.js";
import generateOtpCode from "../Utils/otp-generator.js";

const sendEmailOtp = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const { fullName, emailAddress } = req.body;

  // Checking for required fields
  if (
    ![fullName, emailAddress].every((field) => field && field?.trim() !== "")
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "FullName and emailAddress are required!"
    );
  }

  // Check for user existence
  const user = await User.findOne({ emailAddress });

  if (!user) {
    return responser.sendApiResponse(404, false, "User not found!");
  }

  // Checking for user verification
  if (!user.isVerified) {
    const emailVerificationToken = generateEmailVerificationToken(user._id);

    await emailVerificationSender(
      fullName,
      emailAddress,
      emailVerificationToken
    );

    return responser.sendApiResponse(
      401,
      false,
      "Email isn't verified. Please verify your email!"
    );
  }

  // Generating unique otpCode
  let otpCode;
  let otpCodeDoc;

  do {
    otpCode = generateOtpCode();
    otpCodeDoc = await Otp.findOne({ otpCode });
  } while (otpCodeDoc);

  // Sending otpCode
  await Otp.create({ fullName, emailAddress, otpCode });

  return responser.sendApiResponse(200, true, "Otp has been sent to email.");
});

const sendSmsOtp = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const { fullName, phoneNumber } = req.body;

  // Checing for required fields
  if (
    ![fullName, phoneNumber].every((field) => field && field?.trim() !== "")
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "FullName and phoneNumber are required!"
    );
  }

  // Generating unique otpCode
  let otpCode;
  let otpCodeDoc;

  do {
    otpCode = generateOtpCode();
    otpCodeDoc = await Otp.findOne({ otpCode });
  } while (otpCodeDoc);

  // Sending otpCode
  await Otp.create({ fullName, phoneNumber, otpCode });

  return responser.sendApiResponse(
    200,
    true,
    "OTP code has been sent to your phone number!"
  );
});

export { sendEmailOtp, sendSmsOtp };
