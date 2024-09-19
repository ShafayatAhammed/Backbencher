import { Router } from "express";
import authenticationVerifier from "../Middlewares/authentication-verifier.middleware.js";
import {
  applyToBecomeVendor,
  approveVendorRequest,
  getVendorRequest,
  rejectVendorRequest,
} from "../Controllers/vendor-requests.controller.js";

const vendorRequestsRouter = Router();

vendorRequestsRouter
  .route("/apply-to-become-vendor")
  .post(authenticationVerifier, applyToBecomeVendor);
vendorRequestsRouter
  .route("/get-vendor-request")
  .get(authenticationVerifier, getVendorRequest);
vendorRequestsRouter
  .route("/approve-vendor-request")
  .patch(authenticationVerifier, approveVendorRequest);
vendorRequestsRouter
  .route("/reject-vendor-request")
  .patch(authenticationVerifier, rejectVendorRequest);

export default vendorRequestsRouter;
