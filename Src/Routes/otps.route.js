import { Router } from "express";
import { sendEmailOtp, sendSmsOtp } from "../Controllers/otps.controller.js";

const otpsRouter = Router();

otpsRouter.route("/send-email-otp").get(sendEmailOtp);
otpsRouter.route("/send-sms-otp").get(sendSmsOtp);

export default otpsRouter;
