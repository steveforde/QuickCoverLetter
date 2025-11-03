import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * Generic email sender (using Brevo)
 */
export const sendEmail = async (to, subject, html) => {
  if (!process.env.BREVO_API_KEY) {
    console.error("❌ Missing BREVO_API_KEY in environment variables.");
    return;
  }

  const payload = {
    sender: {
      name: "QuickCoverLetter",
      email: process.env.EMAIL_FROM || "support@quickcoverletter.com",
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  try {
    const response = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Email sent to ${to}: ${subject}`);
    return response.data;
  } catch (err) {
    console.error("❌ Email send failed:", err.response?.data || err.message);
  }
};

/**
 * Payment confirmation email
 */
export const sendPaymentConfirmation = async (to) => {
  try {
    const html = fs.readFileSync(path.resolve("./payment_confirmation.html"), "utf8");
    await sendEmail(to, "Your QuickCoverLetter Payment Confirmation", html);
  } catch (err) {
    console.error("❌ Failed to send payment confirmation:", err.message);
  }
};

/**
 * Cover letter ready email
 */
export const sendLetterReady = async (to) => {
  try {
    const html = fs.readFileSync(path.resolve("./cover_letter_ready.html"), "utf8");
    await sendEmail(to, "Your Cover Letter is Ready!", html);
  } catch (err) {
    console.error("❌ Failed to send 'letter ready' email:", err.message);
  }
};
