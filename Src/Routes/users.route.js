import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  extendSession,
  // getMyProfile,
  getUserProfile,
  getUsersProfiles,
  changeMyFullName,
  changeUserFullName,
  addMyAddresses,
  addMyEmailAddress,
  addUserEmailAddress,
  changeUserRole,
  changeMyAvatar,
  changeUserAvatar,
  addUserAddresses,
  changeMyAddresses,
  changeUserAddresses,
  deleteMyAddresses,
  deleteUser,
  deleteUserAddresses,
  deleteMe,
} from "../Controllers/users.controller.js";
import authenticationVerifier from "../Middlewares/authentication-verifier.middleware.js";
import uploader from "../Middlewares/uploader.middleware.js";

const usersRouter = Router();

usersRouter.route("/register").post(uploader.single("avatar"), registerUser);
usersRouter.route("/logout").post(authenticationVerifier, logoutUser);
usersRouter
  .route("/add-my-email")
  .post(authenticationVerifier, addMyEmailAddress);
usersRouter
  .route("/add-user-email")
  .post(authenticationVerifier, addUserEmailAddress);
usersRouter
  .route("/add-my-addresses")
  .post(authenticationVerifier, addMyAddresses);
usersRouter
  .route("/add-user-addresses")
  .post(authenticationVerifier, addUserAddresses);
usersRouter.route("/login").get(loginUser);
usersRouter.route("/extend-session").get(extendSession);
usersRouter
  .route("/reset-password")
  .patch(authenticationVerifier, resetPassword);
// usersRouter.route("/my-profile").get(authenticationVerifier, getMyProfile);
usersRouter.route("/user-profile").get(authenticationVerifier, getUserProfile);
usersRouter
  .route("/users-profiles")
  .get(authenticationVerifier, getUsersProfiles);
usersRouter
  .route("/change-my-name")
  .patch(authenticationVerifier, changeMyFullName);
usersRouter
  .route("/change-user-name")
  .patch(authenticationVerifier, changeUserFullName);
usersRouter
  .route("/change-user-role")
  .patch(authenticationVerifier, changeUserRole);
usersRouter
  .route("/change-my-avatar")
  .patch(authenticationVerifier, uploader.single("avatar"), changeMyAvatar);
usersRouter
  .route("/change-user-avatar")
  .patch(authenticationVerifier, uploader.single("avatar"), changeUserAvatar);
usersRouter
  .route("/change-my-addresses")
  .patch(authenticationVerifier, changeMyAddresses);
usersRouter
  .route("/change-user-addresses")
  .patch(authenticationVerifier, changeUserAddresses);
usersRouter
  .route("/delete-my-addresses")
  .delete(authenticationVerifier, deleteMyAddresses);
usersRouter
  .route("/delete-user-addresses")
  .delete(authenticationVerifier, deleteUserAddresses);
usersRouter.route("/delete-me").delete(authenticationVerifier, deleteMe);
usersRouter.route("/delete-user").delete(authenticationVerifier, deleteUser);

export default usersRouter;
