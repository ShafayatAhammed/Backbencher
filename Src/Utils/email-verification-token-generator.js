import jwt from "jsonwebtoken";

const generateEmailVerificationToken = (userId) => {
  try {
    const emailVerificationToken = jwt.sign(
      { user: userId },
      process.env.SECRET_EMAIL_VERIFICATION_KEY
    );

    return emailVerificationToken;
  } catch (err) {
    console.log(
      "Something went wrong while generating the email verification token!\n"
    );
    throw new Error(err);
  }
};

export default generateEmailVerificationToken;
