import transporter from "../Utils/transporter.js";

const sendApprovalEmail = async (recipientName, recipientAddress) => {
  try {
    const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vendor Request Approved</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f9f9f9;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #2c7cda;
      }
      a {
        color: #2c7cda;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Congratulations! Your Vendor Request Has Been Approved</h1>
      <p>Dear ${recipientName},</p>
      <p>We are thrilled to inform you that your vendor request has been <strong>approved</strong>! Welcome to the Martina family! We are excited to have you on board and look forward to partnering with you to bring amazing products to our customers.</p>
      <p>Here’s what happens next:</p>
      <ol>
        <li>Log in to your vendor dashboard: <a href="https://www.hablu-programmer.com">Login here</a>.</li>
        <li>Set up your store, upload your products, and start selling.</li>
        <li>Review our vendor guide to ensure you’re well-prepared: <a href="https://www.hablu-programmer.com">Vendor Guide</a>.</li>
      </ol>
      <p>If you have any questions, feel free to reach out to our support team at <a href="mailto:mdshafayat013@gmail.com">mdshafayat013@gmail.com</a>. We are here to help!</p>
      <p>Once again, congratulations and welcome to the team!</p>
      <p>Best regards,<br>
      Shafayat Ahammed<br>
      Vendor Relations Team<br>
      Martina<br>
      <a href="https://www.hablu-programmer.com">https://www.hablu-programmer.com</a></p>
    </div>
  </body>
  </html>
  `;

    await transporter.sendMail({
      from: {
        name: "Martina",
        address: process.env.APP_GMAIL,
      },
      to: recipientAddress,
      subject: "Congratulations! Your Vendor Request Has Been Approved",
      html,
    });
  } catch (err) {
    throw err;
  }
};

const sendRejectionEmail = async (
  recipientName,
  recipientAddress,
  rejectReason
) => {
  try {
    const html = `
    <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vendor Request Rejected</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f9f9f9;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #da2c2c;
      }
      a {
        color: #2c7cda;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Update on Your Vendor Request Application</h1>
      <p>Dear ${recipientName},</p>
      <p>Thank you for applying to become a vendor on Martina. After careful review of your application, we regret to inform you that your vendor request has been <strong>rejected</strong> at this time.</p>
      <p>This decision was based on '${rejectReason}'. However, we encourage you to review our guidelines and consider reapplying in the future once the necessary criteria have been met.</p>
      <p>If you have any questions or need clarification, please don’t hesitate to reach out to us at <a href="mailto:mdshafayat013@gmail.com">mdshafayat013@gmail.com</a>.</p>
      <p>We appreciate your interest in joining our platform and hope to collaborate in the future.</p>
      <p>Best regards,<br>
      Shafayat Ahammed<br>
      Vendor Relations Team<br>
      Martina<br>
      <a href="https://www.hablu-programmer.com">https://www.hablu-programmer.com</a></p>
    </div>
  </body>
  </html>
    `;

    await transporter.sendMail({
      from: {
        name: "Martina",
        address: process.env.APP_GMAIL,
      },
      to: recipientAddress,
      subject: "Update on Your Vendor Request Application",
      html,
    });
  } catch (err) {
    throw err;
  }
};

export { sendApprovalEmail, sendRejectionEmail };
