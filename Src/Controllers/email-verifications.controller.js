import jwt from "jsonwebtoken";
import EmailVerification from "../Models/email-verifications.model.js";
import ApiResponser from "../Utils/api-responser.js";
import generateEmailVerificationToken from "../Utils/email-verification-token-generator.js";
import errorHandler from "../Utils/error-handler.js";
import User from "../Models/users.model.js";

const sendEmailVerificationLink = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const { emailAddress } = req.query;

  // Checing for emailAddress
  if (!emailAddress) {
    return responser.sendApiResponse(400, false, "Email address is required!");
  }

  // Checking for user existence
  const user = await User.findOne({ emailAddress });

  if (!user) {
    return responser.sendApiResponse(404, false, "User not found!");
  }

  // Checking for user verification
  if (user.isVerified) {
    return responser.sendApiResponse(
      409,
      false,
      "Email has already been verified!"
    );
  }

  // Generating unique token
  let verificationToken;
  let verificationTokenDoc;

  do {
    verificationToken = generateEmailVerificationToken(user._id);
    verificationTokenDoc = await EmailVerification.findOne({
      emailVerificationToken: verificationToken,
    });
  } while (verificationTokenDoc);

  // Sending verification link
  await EmailVerification.create({
    user: user._id,
    emailVerificationToken: verificationToken,
  });

  return responser.sendApiResponse(
    200,
    true,
    "Verification link has been sent to email."
  );
});

const emailVerifier = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const { emailVerificationToken } = req.query;

  // Checking for emailVerificationToken
  if (!emailVerificationToken) {
    return responser.sendApiResponse(
      400,
      false,
      "Email verification token is required!"
    );
  }

  // Checking for token validity
  const user = jwt.verify(
    emailVerificationToken,
    process.env.SECRET_EMAIL_VERIFICATION_KEY
  );

  const now = new Date();
  const theUser = await EmailVerification.findOne({
    expiryDate: { $gte: now },
    user: user?.user,
    emailVerificationToken,
  }).populate("user");

  if (!theUser) {
    return responser.sendApiResponse(
      404,
      false,
      "Verification link is not valid!"
    );
  }

  // Checking for user verification
  if (theUser.user.isVerified) {
    return responser.sendApiResponse(
      409,
      false,
      "Email has already been verified!"
    );
  }

  // Verifying user
  theUser.user.isVerified = true;
  await theUser.user.save();

  return responser.sendApiResponse(
    200,
    true,
    "Email has successfully been verified."
  );
});

export { sendEmailVerificationLink, emailVerifier };
