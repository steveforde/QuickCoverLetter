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
// ===================================================
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
// 🪝 STRIPE WEBHOOK (Handles successful payments)
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

  // ✅ Handle successful checkout session
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email || null;
    const name = session.customer_details?.name || "Customer";
    const amountInCents = session.amount_total;

    console.log(`🧾 Payment completed for: ${email}`);

    // 💾 Save transaction to Supabase
    if (supabase) {
      const { error } = await supabase.from("transactions").insert({
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

    // 📧 Send confirmation email through Brevo
    try {
      console.log("📨 Preparing to send confirmation email to:", email);

      await brevoClient.sendTransacEmail({
        sender: { name: "QuickCoverLetter", email: "support@quickprocv.com" },
        to: [{ email, name }],
        subject: "✅ Payment Successful – Your Cover Letter is Ready!",
        htmlContent: `
            <table width="100%" cellspacing="0" cellpadding="0" border="0" 
              style="background:#f4f7fc;padding:40px 0;font-family:Arial,sans-serif;">
              <tr>
                <td align="center">
                  <table width="600" cellspacing="0" cellpadding="0" border="0" 
                    style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);overflow:hidden;">
                    
                    <!-- Header Section -->
                    <tr>
                      <td align="center" style="background:linear-gradient(135deg,#0070f3,#1d4ed8);padding:25px;">
                        <img src="https://raw.githubusercontent.com/steveforde/QuickCoverLetter/main/icon.png" 
                             alt="QuickCoverLetter"
                             width="64" height="64"
                             style="display:block;margin:auto;border-radius:50%;
                                    background:#fff;padding:8px;
                                    box-shadow:0 2px 6px rgba(0,0,0,0.15);">
                        <h1 style="color:#fff;font-size:22px;margin:12px 0 0;">QuickCoverLetter</h1>
                        <p style="color:#eaf1ff;font-size:13px;margin:4px 0 0;">
                          Professional Cover Letter Templates
                        </p>
                      </td>
                    </tr>

                    <!-- Body Section -->
                    <tr>
                      <td style="padding:30px 40px;text-align:left;">
                        <p style="font-size:16px;color:#333;margin:0 0 15px;">
                          Hi <strong>${name}</strong> 👋,
                        </p>
                        <p style="font-size:16px;color:#333;margin:0 0 15px;">
                          We’ve received your payment of 
                          <strong>€${(amountInCents / 100).toFixed(2)}</strong>.
                        </p>
                        <p style="font-size:16px;color:#333;margin:0 0 25px;">
                          Your cover letters are now <strong>unlocked</strong> and ready to use.
                        </p>
                        <div style="text-align:center;margin:30px 0;">
                          <a href="${process.env.DOMAIN}" 
                            style="background:#0070f3;color:#fff;padding:12px 24px;
                                   border-radius:6px;text-decoration:none;
                                   font-weight:bold;display:inline-block;">
                            Generate Your Letter Now
                          </a>
                        </div>
                        <p style="font-size:14px;color:#666;text-align:center;">
                          Thanks for choosing <strong>QuickCoverLetter</strong> 💙
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `,
      });

      console.log("✅ Confirmation email sent to:", email);
    } catch (err) {
      console.error("❌ BREVO ERROR:", err.response?.body || err.message);
    }
  }

  res.json({ received: true });
});

// ===================================================
// 🌐 MIDDLEWARE
// ===================================================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===================================================
// 💳 STRIPE CHECKOUT SESSION (creates payment session)
// ===================================================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: process.env.PRICE_ID, quantity: 1 }],
      success_url: `${process.env.DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/cancel.html`,
      customer_email: req.body.email || undefined,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe checkout error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===================================================
// 📧 TEST EMAIL ENDPOINT (manual verification)
// ===================================================
app.get("/api/test-email", async (req, res) => {
  try {
    await brevoClient.sendTransacEmail({
      sender: { name: "QuickCoverLetter", email: "support@quickprocv.com" },
      to: [{ email: "sforde08@gmail.com", name: "Stephen" }],
      subject: "Test: Cover Letter Ready!",
      htmlContent: `
        <table width="100%" cellspacing="0" cellpadding="0" border="0" 
          style="background:#f4f7fc;padding:40px 0;font-family:Arial,sans-serif;">
          <tr>
            <td align="center">
              <table width="600" cellspacing="0" cellpadding="0" border="0" 
                style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);overflow:hidden;">
                
                <!-- Header Section -->
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#0070f3,#1d4ed8);padding:25px;">
                    <img src="https://raw.githubusercontent.com/steveforde/QuickCoverLetter/main/icon.png"
                         alt="QuickCoverLetter"
                         width="64" height="64"
                         style="display:block;margin:auto;border-radius:50%;
                                background:#fff;padding:8px;
                                box-shadow:0 2px 6px rgba(0,0,0,0.15);">
                    <h1 style="color:#fff;font-size:22px;margin:12px 0 0;">QuickCoverLetter</h1>
                    <p style="color:#eaf1ff;font-size:13px;margin:4px 0 0;">
                      Professional Cover Letter Templates
                    </p>
                  </td>
                </tr>

                <!-- Body Section -->
                <tr>
                  <td style="padding:30px 40px;text-align:left;">
                    <p style="font-size:16px;color:#333;margin:0 0 15px;">
                      Hi <strong>Stephen</strong> 👋,
                    </p>
                    <p style="font-size:16px;color:#333;margin:0 0 15px;">
                      This is a <strong>test email</strong> confirming your setup is complete.
                    </p>
                    <p style="font-size:16px;color:#333;margin:0 0 25px;">
                      Payment: <strong>€1.99</strong>
                    </p>
                    <div style="text-align:center;margin:30px 0;">
                      <a href="${process.env.DOMAIN}" 
                        style="background:#0070f3;color:#fff;padding:12px 24px;
                               border-radius:6px;text-decoration:none;
                               font-weight:bold;display:inline-block;">
                        Go to QuickCoverLetter
                      </a>
                    </div>
                    <p style="font-size:14px;color:#666;text-align:center;">
                      Thanks for choosing <strong>QuickCoverLetter</strong> 💙
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `,
    });

    res.send("✅ TEST EMAIL SENT!");
  } catch (err) {
    console.error("❌ TEST FAILED:", err.response?.body || err.message);
    res.status(500).send("Failed to send email");
  }
});

// ===================================================
// 🚀 START SERVER
// ===================================================

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
