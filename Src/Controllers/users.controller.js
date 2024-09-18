import User from "../Models/users.model.js";
import ApiResponser from "../Utils/api-responser.js";
import { cloudinaryDeleter, cloudinaryUploader } from "../Utils/cloudinary.js";
import errorHandler from "../Utils/error-handler.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import emailVerificationSender from "../Utils/emailVerificationSender.js";
import generateEmailVerificationToken from "../Utils/email-verification-token-generator.js";
import Otp from "../Models/otps.model.js";
import Address from "../Models/addresses.model.js";
import { Types } from "mongoose";

export const registerUser = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);

  const {
    fullName,
    phoneNumber,
    emailAddress,
    password,
    confirmPassword,
    otpCode,
  } = req.body;

  // Checking for required fields
  if (
    ![fullName, phoneNumber, password, confirmPassword, otpCode].every(
      (field) => field && field?.trim() !== ""
    )
  ) {
    if (req?.file) fs.unlinkSync(req.file.path); // Clean up uploaded file if validation fails
    return responser.sendApiResponse(
      400,
      false,
      "Please fill in all required fields!"
    );
  }

  // Checking for if the user already exists
  const existingUser = await User.findOne({
    $or: [{ phoneNumber }, { emailAddress }],
  });
  if (existingUser) {
    if (req?.file) fs.unlinkSync(req.file.path); // Clean up uploaded file if user already exists
    return responser.sendApiResponse(409, false, "User already exists!");
  }

  // Verifying Otp code
  const now = new Date(Date.now());
  const otpCodeDoc = await Otp.find({
    expiryDate: { $gte: now },
    phoneNumber,
  })
    .sort({ createdAt: -1 })
    .limit(1);

  if (!otpCodeDoc.length || otpCode !== otpCodeDoc[0]?.otpCode) {
    if (req?.file) fs.unlinkSync(req.file.path); // Clean up uploaded file if OTP code is invalid
    return responser.sendApiResponse(403, false, "OTP code is invalid!");
  }

  // Checking for passwords match
  if (password !== confirmPassword) {
    if (req?.file) fs.unlinkSync(req.file.path); // Clean up uploaded file if passwords do not match
    return responser.sendApiResponse(401, false, "Passwords do not match!");
  }

  // Uploading user avatar or default avatar
  let avatarUrl =
    "https://res.cloudinary.com/dhvsm6zit/image/upload/v1721975610/martina-user-avatar.jpg";
  let avatarPublicId = "martina-user-avatar";

  if (req?.file) {
    const { url, publicId } = await cloudinaryUploader(
      req.file.path,
      req.file.filename
    );
    avatarUrl = url;
    avatarPublicId = publicId;
  }

  // Registering new user
  const newUser = await User.create({
    fullName,
    phoneNumber,
    emailAddress,
    avatar: { avatarUrl, avatarPublicId },
    password,
  });

  // Sending email verification if email address is provided
  if (emailAddress && emailAddress?.trim() !== "") {
    const emailVerificationToken = generateEmailVerificationToken(newUser._id);
    await emailVerificationSender(
      fullName,
      emailAddress,
      emailVerificationToken
    );
  }

  return responser.sendApiResponse(201, true, "User registration successful.");
});

export const loginUser = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const { phoneNumber, emailAddress, password /*otpCode*/ } = req.body;

  // Checking for required fields
  if (
    ![phoneNumber || emailAddress, password /*otpCode*/].every(
      (field) => field && field?.trim() !== ""
    )
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "Please fill in all required fields!"
    );
  }

  // Checking for if the user exists
  const user = await User.findOne({ $or: [{ phoneNumber }, { emailAddress }] });

  if (!user) {
    return responser.sendApiResponse(404, false, "User not found!");
  }

  // Verifying Otp code
  // const now = new Date(Date.now());
  // const otpCodeDoc = await Otp.find({
  //   expiryDate: { $gte: now },
  //   $or: [{ phoneNumber }, { emailAddress }],
  // })
  //   .sort({ createdAt: -1 })
  //   .limit(1);

  // if (!otpCodeDoc.length || otpCode !== otpCodeDoc[0]?.otpCode) {
  //   return responser.sendApiResponse(403, false, "OTP code is invalid!");
  // }

  // Verifying password
  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    return responser.sendApiResponse(
      401,
      false,
      "Credentials are not correct!"
    );
  }

  // Generating auth tokens
  const { accessToken, refreshToken } = await user.generateAuthTokens();

  await user.save(); // Saving user document

  // Setting accessToken
  responser.sendCookieResponse(
    "accessToken",
    accessToken,
    new Date(Date.now() + 60 * (60 * 1000))
  );

  // Setting refreshToken
  responser.sendCookieResponse(
    "refreshToken",
    refreshToken,
    new Date(Date.now() + 60 * 24 * (60 * 1000))
  );

  return responser.sendApiResponse(
    200,
    true,
    "You have successfully logged in."
  );
});

export const extendSession = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const accessToken = req.cookies?.accessToken;

  // Checking for accessToken
  if (accessToken) {
    return responser.sendApiResponse(403, false, "You have already logged in!");
  }

  // Checking for if accessToken is not present, checking for refreshToken
  const refreshToken = req.cookies?.refreshToken;

  // Checking for refreshToken
  if (!refreshToken) {
    return responser.sendApiResponse(
      404,
      false,
      "You are not able to extend session!",
      { reason: "Refresh token not found" }
    );
  }

  // Verifying refreshToken
  const isTokenVerified = jwt.verify(
    refreshToken,
    process.env.SECRET_REFRESH_KEY
  );

  // Checking for refreshToken validity
  if (!isTokenVerified) {
    return responser.sendApiResponse(
      401,
      false,
      "You are not able to extend session!",
      { reason: "Token invalid" }
    );
  }

  // Checking for user and refreshToken
  const user = await User.findOne({ _id: isTokenVerified._id });

  if (!user || user.refreshToken !== refreshToken) {
    return responser.sendApiResponse(401, false, "Your token isn't valid!", {
      reason: "Token mismatch",
    });
  }

  // Generating auth tokens
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await user.generateAuthTokens();

  await user.save(); // Saving user document

  // Setting accessToken
  responser.sendCookieResponse(
    "accessToken",
    newAccessToken,
    new Date(Date.now() + 60 * (60 * 1000))
  );

  // Setting refreshToken
  responser.sendCookieResponse(
    "refreshToken",
    newRefreshToken,
    new Date(Date.now() + 60 * 24 * (60 * 1000))
  );

  return responser.sendApiResponse(200, true, "Session has been extended.");
});

export const resetPassword = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { oldPassword, newPassword, confirmNewPassword, otpCode } = req.body;

  // Checking for required fields
  if (
    ![oldPassword, newPassword, confirmNewPassword, otpCode].every(
      (field) => field && field?.trim() !== ""
    )
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "Please fill the required fields!"
    );
  }

  // Verifying otp code
  const now = new Date(Date.now());
  const otpCodeDoc = await Otp.find({
    expiryDate: { $gte: now },
    $or: [
      { phoneNumber: user.phoneNumber },
      { emailAddress: user.emailAddress },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(1);

  if (!otpCodeDoc.length || otpCode !== otpCodeDoc[0]?.otpCode) {
    return responser.sendApiResponse(403, false, "Otp code is invalid!");
  }

  // Verifying old passwords
  const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);

  if (!isOldPasswordCorrect) {
    return responser.sendApiResponse(
      401,
      false,
      "Old password is not correct!",
      { reason: "Old password mismatch" }
    );
  }

  // Checking for new and old passwords equality
  if (newPassword === oldPassword) {
    return responser.sendApiResponse(403, false, "Please type a new password!");
  }

  // Checking for new and confirm passwors equality
  if (newPassword !== confirmNewPassword) {
    return responser.sendApiResponse(
      401,
      false,
      "New passwords are not matching!",
      { reason: "New passwords mismatch" }
    );
  }

  // Updating passwords
  await User.updateOne({ _id: user._id }, { $set: { password: newPassword } });

  return responser.sendApiResponse(
    200,
    true,
    "Password has successfully been reset."
  );
});

export const logoutUser = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const refreshToken = req.cookies?.refreshToken;
  const user = req.user;

  // Clearing accessToken cookie
  responser.sendClearCookieResponse("accessToken");

  // Clearing refreshToken cookie if exists
  if (refreshToken) {
    responser.sendClearCookieResponse("refreshToken");
  }

  // Invalidating user's refresh token
  if (user.refreshToken) {
    user.refreshToken = null;
    await user.save();
  }

  return responser.sendApiResponse(
    200,
    true,
    "You have successfully logged out."
  );
});

export const getUserProfile = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const { userId } = req.query;

  // Checking for userid
  if (!userId) {
    return responser.sendApiResponse(400, false, "UserId is required!", {
      reason: "UserId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for userid validity
  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  // Retrieving user
  const theUser = await User.findById(userId);

  if (!theUser) {
    return responser.sendApiResponse(404, false, "User not found!");
  }

  return responser.sendApiResponse(
    200,
    true,
    "You have got the user.",
    theUser
  );
});

export const getUsersProfiles = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  // Retrieving users
  const theUsers = await User.find({ role: { $ne: "ADMIN" } });

  return responser.sendApiResponse(
    200,
    true,
    "You have got all the users.",
    theUsers
  );
});

export const changeMyFullName = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { fullName } = req.body;

  // Checking for required field
  if (!fullName || fullName?.trim() === "") {
    return responser.sendApiResponse(400, false, "FullName is required!");
  }

  // Updating fullName
  await User.updateOne({ _id: user._id }, { $set: { fullName } });

  return responser.sendApiResponse(
    200,
    true,
    "Full name changed successfully."
  );
});

export const changeUserFullName = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  // Checking for required field
  const { fullName } = req.body;
  if (!fullName || fullName?.trim() === "") {
    return responser.sendApiResponse(400, false, "FullName is required!", {
      reason: "FullName missing",
    });
  }

  const { userId } = req.query;

  // Checking for userid
  if (!userId) {
    return responser.sendApiResponse(400, false, "UserId is required!", {
      reason: "UserId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for userid validity
  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  // Checking for user existence
  const theUser = await User.findById(userId);
  if (!theUser) {
    return responser.sendApiResponse(404, false, "User not found!");
  }

  // Updating fullName
  await User.updateOne({ _id: theUser._id }, { $set: { fullName } });

  return responser.sendApiResponse(
    200,
    true,
    "Full name changed successfully."
  );
});

export const addMyEmailAddress = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { emailAddress } = req.body;

  // Checking for required field
  if (!emailAddress || emailAddress?.trim() === "") {
    return responser.sendApiResponse(400, false, "Email is required!");
  }

  // Checking for emailAddress existence
  if (user.emailAddress) {
    return responser.sendApiResponse(
      403,
      false,
      "There is already an email in the account!"
    );
  }

  // Updating emailAddress
  const updatedUser = await User.updateOne(
    { _id: user._id },
    { $set: { emailAddress } }
  );

  // Sending verification link
  const emailVerificationToken = generateEmailVerificationToken(
    updatedUser._id
  );
  await emailVerificationSender(
    updatedUser.fullName,
    emailAddress,
    emailVerificationToken
  );

  return responser.sendApiResponse(200, true, "Email added successfully.");
});

export const addUserEmailAddress = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!",
      { reason: "Not admin" }
    );
  }

  // Checking for required field
  const { emailAddress } = req.body;

  if (!emailAddress || emailAddress?.trim() === "") {
    return responser.sendApiResponse(400, false, "Email is required!", {
      reason: "Email missing",
    });
  }

  const { userId } = req.query;

  // Checking for userid
  if (!userId) {
    return responser.sendApiResponse(400, false, "UserId is required!", {
      reason: "UserId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for userid validity
  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  // Checking for user existence
  const theUser = await User.findById(userId);

  if (!theUser) {
    return responser.sendApiResponse(404, false, "User not found!");
  }

  // Checking for emailAdress existence
  if (user.emailAddress) {
    return responser.sendApiResponse(
      403,
      false,
      "There is already an email in the account!",
      { reason: "Email found" }
    );
  }

  // Updating emailAddress
  const updatedUser = await User.updateOne(
    { _id: theUser._id },
    { $set: { emailAddress } }
  );

  // Sending verification link
  const emailVerificationToken = generateEmailVerificationToken(
    updatedUser._id
  );
  await emailVerificationSender(
    updatedUser.fullName,
    emailAddress,
    emailVerificationToken
  );

  return responser.sendApiResponse(200, true, "Email added successfully.");
});

export const changeUserRole = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const { theRole } = req.query;

  // Checking for role
  if (!theRole) {
    return responser.sendApiResponse(400, false, "Role is required!", {
      reason: "Role missing",
    });
  }

  const { userId } = req.query;

  // Checking for userid
  if (!userId) {
    return responser.sendApiResponse(400, false, "UserId is required!", {
      reason: "UserId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for userid validity
  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  // Checking for user existence
  const theUser = await User.findById(userId);

  if (!theUser) {
    return responser.sendApiResponse(404, false, "User not found!");
  }

  // Checking for role validity
  const isValidRole = [
    "VENDOR",
    "DELIVERER",
    "AFFILIATE PARTNER",
    "CUSTOMER",
  ].includes(theRole);

  if (!isValidRole) {
    return responser.sendApiResponse(400, false, "Role isn't valid!", {
      reason: "Role invalid",
    });
  }

  // Checking for old role
  const isSameRole = theRole === theUser.role;

  if (isSameRole) {
    return responser.sendApiResponse(400, false, "Please select a new role!", {
      reason: "Same role",
    });
  }

  // Updating role
  await User.updateOne({ _id: theUser._id }, { $set: { role: theRole } });

  return responser.sendApiResponse(200, true, "Role changed successfully.");
});

export const changeMyAvatar = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);

  // Checking for avatar
  if (!req?.file) {
    return responser.sendApiResponse(400, false, "Avatar is required!");
  }

  const user = req.user;
  const localAvatar = req.file.path;
  const uploadedAvatar = await cloudinaryUploader(
    localAvatar,
    req.file.filename
  );

  // Checking for if avatar is not platform default
  if (user.avatar.avatarPublicId !== "martina-user-avatar") {
    await cloudinaryDeleter(user.avatar.avatarPublicId);
  }

  // Updating avatar
  await User.updateOne({ _id: user._id }, { $set: { avatar: uploadedAvatar } });

  return responser.sendApiResponse(200, true, "Avatar changed successfully.");
});

export const changeUserAvatar = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);

  // Checking for avatar
  if (!req?.file) {
    return responser.sendApiResponse(400, false, "Avatar is required!", {
      reason: "Avatar missing",
    });
  }
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const { userId } = req.query;

  // Checking for userid
  if (!userId) {
    return responser.sendApiResponse(400, false, "UserId is required!", {
      reason: "UserId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for userid validity
  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  // Checking for user existence
  const theUser = await User.findById(userId);

  if (!theUser) {
    return responser.sendApiResponse(404, false, "User not found!");
  }

  const localAvatar = req.file.path;
  const uploadedAvatar = await cloudinaryUploader(
    localAvatar,
    req.file.filename
  );

  // Checking for if avatar is not platform default
  if (theUser.avatar.avatarPublicId !== "martina-user-avatar") {
    await cloudinaryDeleter(theUser.avatar.avatarPublicId);
  }

  // Updating avatar
  await User.updateOne(
    { _id: theUser._id },
    { $set: { avatar: uploadedAvatar } }
  );

  return responser.sendApiResponse(200, true, "Avatar changed successfully.");
});

export const addMyAddresses = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for required fields
  const { shippingAddress, billingAddress } = req.body;

  if (
    ![shippingAddress, billingAddress].every(
      (field) => field && field?.trim() !== ""
    )
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "Shipping and billing addresses are required!",
      { reason: "Addresses missing" }
    );
  }

  // Checking for address range
  const addresses = await Address.find({ user: user._id });

  if (addresses.length > 5) {
    return responser.sendApiResponse(
      400,
      false,
      "Maximum address range has exceeded!",
      { reason: "Range exceeded" }
    );
  }

  // Adding user addresses
  await Address.create({ user: user._id, shippingAddress, billingAddress });

  return responser.sendApiResponse(200, true, "Addresses added successfully.");
});

export const addUserAddresses = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const { shippingAddress, billingAddress } = req.body;

  // Checking for addresses
  if (
    ![shippingAddress, billingAddress].every(
      (field) => field && field?.trim() !== ""
    )
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "Shipping and billing addresses are required!",
      { reason: "Addresses missing" }
    );
  }

  const { userId } = req.query;

  // Checking for userid
  if (!userId) {
    return responser.sendApiResponse(400, false, "UserId is required!", {
      reason: "UserId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for userid validity
  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  // Checking for user existence
  const theUser = await User.findById(userId);

  if (!theUser) {
    return responser.sendApiResponse(404, false, "User not found!");
  }

  // Checking for address range
  const addresses = await Address.find({ user: theUser._id });

  if (addresses.length > 5) {
    return responser.sendApiResponse(
      400,
      false,
      "User has exceeded the maximum address range!",
      { reason: "Range exceeded" }
    );
  }

  // Adding user addresses
  await Address.create({
    user: theUser._id,
    shippingAddress,
    billingAddress,
  });

  return responser.sendApiResponse(200, true, "Addresses added successfully.");
});

export const changeMyAddresses = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { addressId } = req.query;

  // Checking for addressid
  if (!addressId) {
    return responser.sendApiResponse(400, false, "AddressId is required!", {
      reason: "AddressId missing",
    });
  }

  const { shippingAddress, billingAddress } = req.body;

  // Checking for required fields
  if (
    ![shippingAddress, billingAddress].every(
      (field) => field && field.trim() !== ""
    )
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "Shipping and billing addresses are required!",
      { reason: "Addresses missing" }
    );
  }

  const { ObjectId } = Types;

  // Checking for addressid validity
  if (!ObjectId.isValid(addressId)) {
    return responser.sendApiResponse(400, false, "AddressId is invalid!", {
      reason: "AddressId invalid",
    });
  }

  // Retrieving addresses
  const theAddress = await Address.aggregate([
    { $match: { user: user._id } },
    { $match: { _id: new ObjectId(addressId) } },
  ]);

  // Checking for addresses existence
  if (!theAddress) {
    return responser.sendApiResponse(404, false, "No address found!", {
      reason: "Address missing",
    });
  }

  // Updating user addresses
  await Address.updateOne(
    { _id: addressId },
    { $set: { shippingAddress, billingAddress } }
  );

  return responser.sendApiResponse(200, true, "Address changed successfully.");
});

export const changeUserAddresses = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const { shippingAddress, billingAddress } = req.body;

  // Checking for required fields
  if (
    ![shippingAddress, billingAddress].every(
      (field) => field && field?.trim() !== ""
    )
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "Shipping and billing addresses are required!",
      { reason: "Addresses missing" }
    );
  }

  const { userId, addressId } = req.query;

  // Checking for userid and addressid
  if (!userId || !addressId) {
    return responser.sendApiResponse(
      400,
      false,
      "User and Address ids are required!",
      { reason: "Ids missing" }
    );
  }

  const { ObjectId } = Types;

  // Checking for userid validity
  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  // Checking for addressid validity
  if (!ObjectId.isValid(addressId)) {
    return responser.sendApiResponse(400, false, "AddressId is invalid!", {
      reason: "AddressId invalid",
    });
  }

  // Checking for user existence
  const theUser = await User.findById(userId);

  if (!theUser) {
    return responser.sendApiResponse(404, false, "User not found!", {
      reason: "User missing",
    });
  }

  // Checking for addresses existence
  const theAddress = await Address.aggregate([
    { $match: { user: new ObjectId(userId), _id: new ObjectId(addressId) } },
  ]);

  if (!theAddress) {
    return responser.sendApiResponse(404, false, "No address found!", {
      reason: "Address missing",
    });
  }

  // Updating user addresses
  await Address.updateOne(
    { _id: addressId },
    { $set: { shippingAddress, billingAddress } }
  );

  return responser.sendApiResponse(200, true, "Address changed successfully.");
});

export const deleteMyAddresses = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  const { addressId } = req.query;

  // Check for addressid
  if (!addressId) {
    return responser.sendApiResponse(400, false, "AddressId is required!", {
      reason: "AddressId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for addressid validity
  if (!ObjectId.isValid(addressId)) {
    return responser.sendApiResponse(400, false, "AddressId is invalid!", {
      reason: "AddressId invalid",
    });
  }

  // Retrieving addresses
  const theAddress = await Address.aggregate([
    {
      $match: { user: user._id },
    },
    {
      $match: {
        _id: new ObjectId(addressId),
      },
    },
  ]);

  // Checking for addresses existence
  if (!theAddress.length) {
    return responser.sendApiResponse(404, false, "No address found!", {
      reason: "Address missing",
    });
  }

  // Deleting addresses
  await Address.deleteOne({ _id: addressId });

  return responser.sendApiResponse(200, true, "Address deleted successfully.");
});

export const deleteUserAddresses = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const { userId, addressId } = req.query;

  // Checking for userid and addressid
  if (!userId || !addressId) {
    return responser.sendApiResponse(
      400,
      false,
      "User and Address ids are required!",
      { reason: "Ids missing" }
    );
  }

  const { ObjectId } = Types;

  // Checking for userid validity
  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  // Checking for addressid validity
  if (!ObjectId.isValid(addressId)) {
    return responser.sendApiResponse(400, false, "AddressId is invalid!", {
      reason: "AddressId invalid",
    });
  }

  // Checking for user existence
  const userExists = await User.findById(userId);

  if (!userExists) {
    return responser.sendApiResponse(404, false, "User not found!", {
      reason: "User missing",
    });
  }

  // Checking for addresses existence
  const addressExists = await Address.aggregate([
    { $match: { user: new ObjectId(userId) } },
    { $match: { _id: new ObjectId(addressId) } },
  ]);

  if (!addressExists.length) {
    return responser.sendApiResponse(404, false, "No address found!", {
      reason: "Address missing",
    });
  }

  // Deleting addresses
  await Address.deleteOne({ _id: addressId });

  return responser.sendApiResponse(200, true, "Address deleted successfully.");
});

export const deleteMe = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { otpCode } = req.body;

  // Checking for otp code
  if (!otpCode || otpCode?.trim() === "") {
    return responser.sendApiResponse(400, false, "OtpCode is required!");
  }

  // Verifying otp code
  const now = new Date(Date.now());
  const otpCodeDoc = await Otp.find({
    expiryDate: { $gte: now },
    $or: [
      { phoneNumber: user.phoneNumber },
      { emailAddress: user.emailAddress },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(1);

  if (!otpCodeDoc || otpCode !== otpCodeDoc.otpCode) {
    return responser.sendApiResponse(403, false, "Otp code is invalid!");
  }

  // Checking for if avatar is not platform default
  if (user.avatar.avatarPublicId !== "martina-user-avatar") {
    await cloudinaryDeleter(user.avatar.avatarPublicId);
  }

  // Deleting user
  await User.deleteOne({ _id: user._id });

  return responser.sendApiResponse(200, true, "User deleted successfully.");
});

export const deleteUser = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { userId } = req.query;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  // Checking for userid
  if (!userId) {
    return responser.sendApiResponse(400, false, "UserId is required!");
  }

  const { ObjectId } = Types;

  // Checking for userid validity
  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  // Checking for user existence
  const theUser = await User.findById(userId);

  if (!theUser) {
    return responser.sendApiResponse(404, false, "User not found!");
  }

  // Checking for if avatar is not platform default
  if (theUser.avatar.avatarPublicId !== "martina-user-avatar") {
    await cloudinaryDeleter(theUser.avatar.avatarPublicId);
  }

  // Deleting user
  await User.deleteOne({ _id: theUser._id });

  return responser.sendApiResponse(200, true, "User deleted successfully.");
});
