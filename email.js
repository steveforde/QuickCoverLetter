import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * Send an email using Brevo (Sendinblue) SMTP API.
 * Works with your Render + .env setup.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html - Full HTML content for the message
 */
export const sendEmail = async (to, subject, html) => {
  if (!process.env.BREVO_API_KEY) {
    console.error("❌ Missing BREVO_API_KEY in environment variables.");
    return;
  }

  if (!process.env.EMAIL_FROM) {
    console.error("⚠️ Missing EMAIL_FROM in environment variables, using fallback address.");
  }

  const senderEmail = process.env.EMAIL_FROM || "support@quickcoverletter.com";

  const payload = {
    sender: {
      name: "QuickCoverLetter Support",
      email: senderEmail,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html || "<p>No content provided</p>",
  };

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10000, // prevent Render timeouts
      }
    );

    console.log(`✅ Brevo email sent to ${to}`);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Brevo email failed:",
      error.response?.data || error.message
    );
    throw error;
  }
};

