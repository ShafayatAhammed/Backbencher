import jwt from "jsonwebtoken";

const generateEmailVerificationToken = (userId) => {
  try {
    const emailVerificationToken = jwt.sign(
      { user: userId },
      process.env.SECRET_EMAIL_VERIFICATION_KEY
    );

    return emailVerificationToken;
  } catch (err) {
    throw err;
  }
};

export default generateEmailVerificationToken;
