import express from "express";
import cookieParser from "cookie-parser";
import usersRouter from "./Routes/users.route.js";
import otpsRouter from "./Routes/otps.route.js";
import emailVerificationsRouter from "./Routes/email-verifications.route.js";
import productsRouter from "./Routes/products.route.js";
import wishlistsRouter from "./Routes/wishlists.route.js";
import ordersRouter from "./Routes/orders.route.js";
import cartsRouter from "./Routes/carts.route.js";
import paypalRouter from "./Routes/paypal.route.js";
import cors from "cors";
import vendorsRouter from "./Routes/vendors.route.js";

export const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "1000kb" }));
app.use(express.urlencoded({ extended: true, limit: "1000kb" }));
app.use(cookieParser());
app.use(express.static("Public"));
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/otps", otpsRouter);
app.use("/api/v1/emails", emailVerificationsRouter);
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/wishlists", wishlistsRouter);
app.use("/api/v1/orders", ordersRouter);
app.use("/api/v1/carts", cartsRouter);
app.use("/api/v1/paypal", paypalRouter);
app.use("/api/v1/vendors", vendorsRouter);
