import { Router } from "express";
import { getMyOrders, placeOrder } from "../Controllers/orders.controller.js";
import authenticationVerifier from "../Middlewares/authentication-verifier.middleware.js";

const ordersRouter = Router();

ordersRouter.route("/place-order").post(authenticationVerifier, placeOrder);
ordersRouter.route("/get-my-orders").get(authenticationVerifier, getMyOrders);

export default ordersRouter;
