import { Router } from "express";
import authenticationVerifier from "../Middlewares/authentication-verifier.middleware.js";
import uploader from "../Middlewares/uploader.middleware.js";
import {
  addProduct,
  addProductImagesVideos,
  deleteProductImagesVideos,
  deleteProducts,
  getProduct,
  getVendorProducts,
  searchProducts,
  updateProduct,
} from "../Controllers/products.controller.js";

const productsRouter = Router();

productsRouter.route("/add-product").post(
  authenticationVerifier,
  uploader.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 10 },
  ]),
  addProduct
);
productsRouter.route("/search-products").get(searchProducts);
productsRouter
  .route("/get-vendor-products")
  .get(authenticationVerifier, getVendorProducts);
productsRouter.route("/get-product").get(getProduct);
productsRouter
  .route("/update-product")
  .patch(authenticationVerifier, updateProduct);
productsRouter.route("/add-images-videos").post(
  authenticationVerifier,
  uploader.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 10 },
  ]),
  addProductImagesVideos
);
productsRouter
  .route("/delete-images-videos")
  .delete(authenticationVerifier, deleteProductImagesVideos);
productsRouter
  .route("/delete-products")
  .delete(authenticationVerifier, deleteProducts);

export default productsRouter;
