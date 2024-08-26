import { Router } from "express";
import {
  addToCart,
  getMyCart,
  getUserCart,
  removeFromCart,
} from "../Controllers/carts.controller.js";
import authenticationVerifier from "../Middlewares/authentication-verifier.middleware.js";

const cartsRouter = Router();

cartsRouter.route("/add-to-cart").post(authenticationVerifier, addToCart);
cartsRouter.route("/get-my-cart").get(authenticationVerifier, getMyCart);
cartsRouter.route("/get-user-cart").get(authenticationVerifier, getUserCart);
cartsRouter
  .route("/remove-from-cart")
  .delete(authenticationVerifier, removeFromCart);

export default cartsRouter;
