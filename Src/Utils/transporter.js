import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "mdshafayat013@gmail.com",
    pass: "pvni mbdw akye cjnl",
  },
});

export default transporter;
