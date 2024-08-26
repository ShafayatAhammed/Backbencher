import { Router } from "express";
import { placeOrder } from "../Controllers/orders.controller.js";
import authenticationVerifier from "../Middlewares/authentication-verifier.middleware.js";

const ordersRouter = Router();

ordersRouter.route("/place-order").post(authenticationVerifier, placeOrder);

export default ordersRouter;
