// ===================================================
// 🧩 Dependencies
// ===================================================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ===================================================
// 🟦 BREVO (Transactional Email API)
// ===================================================
const brevoClient = new brevo.TransactionalEmailsApi();
brevoClient.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

/**
 * Global helper function to send emails via Brevo.
 * Moved outside the webhook handler to be accessible by all routes.
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

app.use(
  cors({
    origin: [
      "https://quickcoverletter-static.onrender.com",
      "https://quickcoverletter.app",
      "https://www.quickcoverletter.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// ===================================================
// 🪝 STRIPE WEBHOOK (MUST BE FIRST)
// This is the only route that needs a "raw" body.
// ===================================================
app.post("/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
  console.log("⚡ Webhook triggered");

  const sig = req.headers["stripe-signature"];
  let event;

  // ✅ Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🧩 Prevent duplicate processing for the same payment
  if (supabase && event.id) {
    // Check for transaction using session ID as payment_intent
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("payment_intent", event.data.object.payment_intent || event.data.object.id)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("⚠️ Duplicate webhook event ignored:", event.id);
      return res.json({ received: true });
    }
  }

  // ✅ 1. SUCCESSFUL PAYMENT (deduplicated)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email || null;
    const name = session.customer_details?.name || "Customer";
    const amountInCents = session.amount_total;

    // 🔒 Avoid duplicates (check by session.id)
    const { data: exists } = await supabase
      .from("transactions")
      .select("id")
      .eq("payment_intent", session.id)
      .limit(1);

    if (exists && exists.length > 0) {
      console.log("⚠️ Duplicate session.completed ignored for:", email);
      return res.json({ received: true });
    }

    console.log(`🧾 Payment completed for: ${email}`);

    // 💾 Save transaction
    if (supabase) {
      const { error } = await supabase.from("transactions").insert({
        // session.id is used here as the payment_intent identifier for checkout.session events
        payment_intent: session.id,
        email,
        name,
        amount: amountInCents,
        currency: session.currency,
        status: session.payment_status,
        created_at: new Date(),
      });
      if (error) console.error("❌ DB insert error:", error.message);
    }

    // 📧 SUCCESS EMAIL (This is the master template)
    await sendBrevoEmail({
      toEmail: email,
      toName: name,
      subject: "✅ Payment Successful – Your Cover Letter Is Ready!",
      html: `
  <table width="100%" cellspacing="0" cellpadding="0" border="0"
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
              <p style="font-size:17px;color:#333;margin:0 0 20px;">Hi <strong>${name}</strong> 👋,</p>
              
              <p style="font-size:16px;color:#333;margin:0 0 18px;">
                Your payment of <strong>€${(amountInCents / 100).toFixed(2)}</strong> has been received successfully.
              </p>

              <p style="font-size:16px;color:#333;margin:0 0 25px;">
                You can now create and download your custom cover letter instantly.
              </p>

              <div style="text-align:center;margin:35px 0;">
                <a href="${process.env.DOMAIN}"
                  style="background:#0070f3;color:#fff;padding:14px 28px;border-radius:8px;
                         text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
                  Build My Cover Letter
                </a>
              </div>

              <p style="font-size:14px;color:#555;text-align:center;margin-top:25px;">
                You will only ever be charged once – no subscriptions, no renewals. ✅
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
  }

  // ❌ PAYMENT FAILED (UPDATED DESIGN)
  if (event.type === "charge.failed") {
    const charge = event.data.object;

    const email =
      charge?.billing_details?.email || charge?.receipt_email || charge?.customer_email || null;

    const name = charge?.billing_details?.name || "there";

    console.log("⚠️ Payment failed for:", email);

    if (!email) {
      console.log("⚠️ No email found — skipping failed payment email.");
      return res.json({ received: true });
    }

    await sendBrevoEmail({
      toEmail: email,
      toName: name,
      subject: "Your Cover Letter Payment Didn’t Go Through",
      html: `
      <table width="100%" cellspacing="0" cellpadding="0" border="0"
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
                  <p style="font-size:17px;color:#333;margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
                  
                  <p style="font-size:16px;color:#333;margin:0 0 18px;">
                    It looks like your €1.99 payment didn’t go through this time.
                  </p>

                  <p style="font-size:16px;color:#333;margin:0 0 25px;">
                    No worries — <strong>you haven’t been charged.</strong> This can happen if the card was declined or the session expired.
                  </p>

                  <div style="text-align:center;margin:35px 0;">
                    <a href="${process.env.DOMAIN}"
                      style="background:#0070f3;color:#fff;padding:14px 28px;border-radius:8px;
                             text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
                      Resume My Cover Letter
                    </a>
                  </div>

                  <p style="font-size:14px;color:#555;text-align:center;margin-top:25px;">
                    You will only ever be charged once – no subscriptions, no renewals. ✅
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
      </table>
    `,
    });

    return res.json({ received: true });
  }

  // 🕓 3. CHECKOUT CANCELED / EXPIRED (UPDATED DESIGN)
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email || null;
    const name = session.customer_details?.name || "Customer";

    console.log("🟨 Session expired/canceled for:", email);

    if (email) {
      await sendBrevoEmail({
        toEmail: email,
        toName: name,
        subject: "⏳ You didn't finish your €1.99 cover letter",
        html: `
  <table width="100%" cellspacing="0" cellpadding="0" border="0"
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
              <p style="font-size:17px;color:#333;margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
              
              <p style="font-size:16px;color:#333;margin:0 0 18px;">
                You started buying your cover letter for <strong>€1.99</strong> but didn't finish.
              </p>

              <p style="font-size:16px;color:#333;margin:0 0 25px;">
                No stress — just click below and you can complete it in seconds.
              </p>

              <div style="text-align:center;margin:35px 0;">
                <a href="https"
                  style="background:#0070f3;color:#fff;padding:14px 28px;border-radius:8px;
                         text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
                  Continue Your Cover Letter
                </a>
              </div>

              <p style="font-size:14px;color:#555;text-align:center;margin-top:25px;">
                You will only ever be charged once – no subscriptions, no renewals. ✅
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
    }
  }

  res.json({ received: true });
});

// Handle Stripe cancel redirect with real session ID in path
app.get("/cancel/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  console.log("CANCEL REDIRECT → session ID:", sessionId); // LOG THIS!
  // Add the full frontend URL here
  res.redirect(
    `https://quickcoverletter-static.onrender.com/?status=cancelled&session_id=${sessionId}`
  );
});

// ===================================================
// 🌐 JSON PARSER (MUST BE SECOND)
// All other routes below this line will now be
// able to read JSON from req.body.
// ===================================================
app.use(express.json());

// Immediate Cancel Email (User clicked cancel) (UPDATED DESIGN)
app.post("/send-cancel-email", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("CANCEL EMAIL REQUEST:", email); // LOG

    if (!email) return res.status(400).json({ error: "No email provided" });

    await sendBrevoEmail({
      toEmail: email,
      toName: "User", // This is hardcoded to "User", so we'll say "Hi there,"
      subject: "⏳ You didn't finish your cover letter",
      html: `
  <table width="100%" cellspacing="0" cellpadding="0" border="0"
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
              <p style="font-size:17px;color:#333;margin:0 0 20px;">Hi there,</p>
              
              <p style="font-size:16px;color:#333;margin:0 0 18px;">
                You started creating your cover letter but didn't finish the payment.
              </p>

              <p style="font-size:16px;color:#333;margin:0 0 25px;">
                No problem — nothing was charged. Your details are still on your device and you can resume instantly.
              </p>

              <div style="text-align:center;margin:35px 0;">
                <a href="https"
                  style="background:#0070f3;color:#fff;padding:14px 28px;border-radius:8px;
                         text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
                  Continue My Cover Letter
                </a>
              </div>

              <p style="font-size:14px;color:#555;text-align:center;margin-top:25px;">
                You will only ever be charged once – no subscriptions, no renewals. ✅
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
  </table>
  `,
    });

    console.log("CANCEL EMAIL SENT TO:", email); // LOG
    res.json({ success: true });
  } catch (err) {
    console.error("BREVO ERROR:", err.response?.body || err.message); // FULL ERROR
    res.status(500).json({ error: "Cancel email failed", details: err.message });
  }
});

app.get("/get-session-email/:sessionId", async (req, res) => {
  console.log("📩 Fetching email for session:", req.params.sessionId); // LOG
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const email = session.customer_details?.email || session.customer_email || null;
    if (!email) throw new Error("No email in session");
    res.json({ email });
  } catch (err) {
    console.error("❌ Session fetch error:", err.message);
    res.status(404).json({ error: "Session not found" });
  }
});

// ===================================================
// 🌐 MIDDLEWARE
// ===================================================

// ===================================================
// 💳 STRIPE CHECKOUT SESSION (FINAL, static domain)
// ===================================================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const email = req.body.email;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: process.env.PRICE_ID, quantity: 1 }],

      success_url: "https://quickcoverletter-static.onrender.com/?session_id={CHECKOUT_SESSION_ID}",
      // In /create-checkout-session route
      cancel_url: "https://quickcoverletter-backend.onrender.com/cancel/{CHECKOUT_SESSION_ID}",

      customer_email: email || undefined,
      metadata: { email },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Error:", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ===================================================
// 📧 TEST EMAIL ENDPOINTS
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
    // THIS IS THE LINE I FIXED (from 5Two to 500)
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
                All your emails (Success, Failed, and Cancelled) will now have this professional design.
              </p>

              <div style="text-align:center;margin:35px 0;">
                <a href="${process.env.DOMAIN}"
                  style="background:#0070f3;color:#fff;padding:14px 28px;border-radius:8px;
                         text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
                  Go to QuickCoverLetter
                </a>
              </div>

              <p style="font-size:14px;color:#555;text-align:center;margin-top:25px;">
                This is just a test. No payment was processed.
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
    message: "QuickCoverLetter backend is running ✅",
    time: new Date().toISOString(),
  });
});

app.use(express.static(__dirname));

// ===================================================
// 🚀 START SERVER
// ===================================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
