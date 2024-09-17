import { Router } from "express";
import authenticationVerifier from "../Middlewares/authentication-verifier.middleware.js";
import {
  capturePaypalOrder,
  createPaypalOrder,
} from "../Controllers/paypal.controller.js";

const paypalRouter = Router();

paypalRouter
  .route("/create-paypal-order")
  .post(authenticationVerifier, createPaypalOrder);
paypalRouter
  .route("/capture-paypal-order")
  .get(authenticationVerifier, capturePaypalOrder);

export default paypalRouter;
