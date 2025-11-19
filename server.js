// ===================================================
// 🧩 Dependencies
// ===================================================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// REMOVED: import Stripe from "stripe";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import brevo from "@getbrevo/brevo";
import path from "path";
import { fileURLToPath } from "url";

// ===================================================
// 📁 Path setup (ESM-friendly)
// =================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================================================
// ⚙️ Environment & App Setup
// ===================================================
dotenv.config();
const app = express();
// REMOVED: const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ===================================================
// 🟦 BREVO (Transactional Email API)
// ===================================================
const brevoClient = new brevo.TransactionalEmailsApi();
brevoClient.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

/**
 * Global helper function to send emails via Brevo.
 */
const sendBrevoEmail = async ({ toEmail, toName, subject, html }) => {
  try {
    const result = await brevoClient.sendTransacEmail({
      sender: {
        name: "QuickCoverLetter",
        email: "support@quickcoverletter.app",
      },
      replyTo: {
        email: "sforde08@gmail.com",
        name: "Stephen",
      },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent: html,
    });

    console.log("✅ Email sent:", result);
    return result;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

// ===================================================
// 🟩 SUPABASE (Database)
// ===================================================
const SUPABASE_URL = "https://ztrsuveqeftmgoeiwjgz.supabase.co";
let supabase = null;

try {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (serviceRole) {
    supabase = createClient(SUPABASE_URL, serviceRole);
  } else {
    console.warn("⚠️ SUPABASE_SERVICE_ROLE missing");
  }
} catch (e) {
  console.error("❌ Supabase init failed:", e.message);
}

// ===================================================
// 🪝 IAP TRANSACTION WEBHOOK (Placeholder)
// REMOVED: Stripe Webhook route entirely.
// This is where you would place your IAP Verification endpoint.
// ===================================================
// app.post("/verify-receipt", async (req, res) => {
//     // This route would handle the StoreKit receipt verification from your iOS app
//     // and fulfill the product (save to Supabase, send email).
// });

// ===================================================
// 🌐 MIDDLEWARE
// ===================================================
// The bodyParser.raw is NOT needed as the Stripe webhook is gone.
// However, the JSON parser is needed for other routes.
// We must put the JSON parser after the CORS setup.
app.use(
  cors({
    origin: [
      "https://quickcoverletter.onrender.com",
      "https://quickcoverletter.app",
      "https://www.quickcoverletter.app",
      "http://localhost:3000",
      "https://quickcoverletter-backend.onrender.com",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// JSON PARSER
app.use(express.json());

// ===================================================
// 📧 REMOVED STRIPE-SPECIFIC EMAIL ROUTES
// ===================================================
// REMOVED: app.post("/send-cancel-email", ...)
// REMOVED: app.get("/get-session-email/:sessionId", ...)

// ===================================================
// 💳 REMOVED STRIPE CHECKOUT SESSION ROUTE
// ===================================================
// REMOVED: app.post("/create-checkout-session", ...)

// ===================================================
// 📧 TEST EMAIL ENDPOINTS (Kept for sanity check)
// ===================================================
app.post("/api/send-test-email", async (req, res) => {
  try {
    const { to } = req.body;
    await sendBrevoEmail({
      toEmail: to || "sforde08@gmail.com",
      toName: "Test Recipient",
      subject: "QuickCoverLetter — Test Email ✅",
      html: `<h2>QuickCoverLetter</h2><p>Your Brevo email system is working perfectly!</p>`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/test-email", async (req, res) => {
  try {
    await sendBrevoEmail({
      toEmail: "sforde08@gmail.com",
      toName: "Stephen",
      subject: "Test: Your New Email Template is Working!",
      html: `<table width="100%" cellspacing="0" cellpadding="0" border="0"
    style="background:#f4f7fc;padding:40px 0;font-family:Arial,sans-serif;">
    <tr>
      <td align="center">
        <table width="600" cellspacing="0" cellpadding="0" border="0"
          style="background:#ffffff;border-radius:12px;box-shadow:0 3px 10px rgba(0,0,0,0.05);overflow:hidden;">
          
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#0070f3,#1d4ed8);padding:25px;">
              <img src="https://raw.githubusercontent.com/steveforde/QuickCoverLetter/main/icon.png"
                alt="QuickCoverLetter"
                width="70" height="70"
                style="display:block;margin:auto;border-radius:50%;background:#fff;
                       padding:8px;box-shadow:0 2px 6px rgba(0,0,0,0.15);">
              <h1 style="color:#ffffff;font-size:22px;margin:14px 0 4px;">QuickCoverLetter</h1>
              <p style="color:#eaf1ff;font-size:13px;margin:0;">Professional Cover Letter Templates</p>
            </td>
          </tr>

          <tr>
            <td style="padding:35px 45px;text-align:left;">
              <p style="font-size:17px;color:#333;margin:0 0 20px;">Hi <strong>Stephen</strong> 👋,</p>
              
              <p style="font-size:16px;color:#333;margin:0 0 18px;">
                This is a <strong>test email</strong> confirming your new email template is working perfectly.
              </p>

              <p style="font-size:16px;color:#333;margin:0 0 25px;">
                All your emails will now have this professional design.
              </p>

              <div style="text-align:center;margin:35px 0;">
                <a href="${process.env.DOMAIN}"
                  style="background:#0070f3;color:#fff;padding:14px 28px;border-radius:8px;
                         text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
                  Go to QuickCoverLetter
                </a>
              </div>

              <p style="font-size:14px;color:#555;text-align:center;margin-top:25px;">
                This is just a test.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="background:#f9fafb;padding:20px;border-top:1px solid #eee;">
             <p style="font-size:13px;color:#777;margin:0;">
              Made in Ireland<br>
               <span style="color:#999;">QuickCoverLetter · quickcoverletter.app</span>
            </p>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`,
    });
    res.send("✅ TEST EMAIL SENT with new template!");
  } catch (err) {
    console.error("❌ TEST FAILED:", err.response?.body || err.message);
    res.status(500).send("Failed to send email");
  }
});

// ===================================================
// ✅ Unlock check endpoint (for frontend sanity check)
// ===================================================
app.get("/api/unlock-status", (req, res) => {
  res.json({ ok: true });
});

// ==================================================
// 🔍 STATUS CHECK
// ===================================================
app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    message: "QuickCoverLetter backend is running (Stripe removed) ✅",
    time: new Date().toISOString(),
  });
});

app.use(express.static(__dirname));

// ===================================================
// 🚀 START SERVER
// ===================================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
