import { Router } from "express";
import {
  getMyOrders,
  getOrder,
  getUserOrders,
  placeOrder,
  updateOrderStatus,
} from "../Controllers/orders.controller.js";
import authenticationVerifier from "../Middlewares/authentication-verifier.middleware.js";

const ordersRouter = Router();

ordersRouter.route("/place-order").post(authenticationVerifier, placeOrder);
ordersRouter.route("/get-my-orders").get(authenticationVerifier, getMyOrders);
ordersRouter
  .route("/get-user-orders")
  .get(authenticationVerifier, getUserOrders);
ordersRouter.route("/get-order").get(authenticationVerifier, getOrder);
ordersRouter
  .route("/update-order-status")
  .path(authenticationVerifier, updateOrderStatus);

export default ordersRouter;
