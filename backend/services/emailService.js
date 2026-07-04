const nodemailer = require("nodemailer");

const clientUrl = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean)[0];

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends an email. Centralized so swapping providers (SendGrid, SES, etc.)
 * only requires changes here.
 */
const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${clientUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your ChatApp account",
    html: `
      <h2>Welcome to ChatApp, ${user.username}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${clientUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your ChatApp password",
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
