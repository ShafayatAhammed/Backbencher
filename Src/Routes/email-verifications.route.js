import { Router } from "express";
import {
  sendEmailVerificationLink,
  emailVerifier,
} from "../Controllers/email-verifications.controller.js";

const emailVerificationsRouter = Router();

emailVerificationsRouter
  .route("/send-email-verification-link")
  .get(sendEmailVerificationLink);
emailVerificationsRouter.route("/verify-email").post(emailVerifier);

export default emailVerificationsRouter;
