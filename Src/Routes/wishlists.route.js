import { Router } from "express";
import {
  addProductInWishlist,
  getMyWishlists,
  getUserWishlists,
  removeProductFromMyWishlist,
} from "../Controllers/wishlists.controller.js";
import authenticationVerifier from "../Middlewares/authentication-verifier.middleware.js";

const wishlistsRouter = Router();

wishlistsRouter
  .route("/add-in-wishlist")
  .post(authenticationVerifier, addProductInWishlist);
wishlistsRouter
  .route("/get-my-wishlist")
  .get(authenticationVerifier, getMyWishlists);
wishlistsRouter
  .route("/get-user-wishlist")
  .get(authenticationVerifier, getUserWishlists);
wishlistsRouter
  .route("/remove-from-wishlist")
  .delete(authenticationVerifier, removeProductFromMyWishlist);

export default wishlistsRouter;
