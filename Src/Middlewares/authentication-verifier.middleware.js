import User from "../Models/users.model.js";
import jwt from "jsonwebtoken";
import errorHandler from "../Utils/error-handler.js";
import ApiResponser from "../Utils/api-responser.js";

const authenticationVerifier = errorHandler(async (req, res, next) => {
  const responser = new ApiResponser(res);
  const accessToken = req.cookies?.accessToken;

  if (accessToken) {
    const isTokenVerified = jwt.verify(
      accessToken,
      process.env.SECRET_ACCESS_KEY
    );

    const user = await User.findOne({ _id: isTokenVerified?._id });

    if (isTokenVerified && user) {
      req.user = user;

      next();
    } else {
      return responser.sendApiResponse(
        401,
        false,
        "Your session is not valid!"
      );
    }
  } else {
    return responser.sendApiResponse(400, false, "You are not logged in!");
  }
});

export default authenticationVerifier;
