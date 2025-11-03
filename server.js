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
import { loadTemplate } from "./emailTemplates.js";

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
const PORT = process.env.PORT || 10000;

// ===================================================
// 🟦 BREVO (Transactional Email API)
// ===================================================
const brevoClient = new brevo.TransactionalEmailsApi();
brevoClient.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

const sendBrevoEmail = async ({ toEmail, toName, subject, template }) => {
  try {
    const html = loadTemplate(template);
    await brevoClient.sendTransacEmail({
      sender: { name: "QuickCoverLetter", email: "support@quickprocv.com" },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent: html,
    });
    console.log(`✅ Email sent to ${toEmail} — ${template}`);
  } catch (err) {
    console.error("❌ Brevo send error:", err.response?.body || err.message);
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
// 🪝 STRIPE WEBHOOK
// ===================================================
app.post("/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
  console.log("⚡ Webhook triggered");

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ===================================================
  // ✅ 1. SUCCESSFUL PAYMENT
  // ===================================================
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const name = session.customer_details?.name || "Customer";
    const amountInCents = session.amount_total;

    console.log(`🧾 Payment completed for ${email}`);

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

    await sendBrevoEmail({
      toEmail: email,
      toName: name,
      subject: "✅ Payment Successful – Your Cover Letter Is Ready!",
      template: "payment_success",
    });
  }

  // ===================================================
  // ❌ 2. PAYMENT FAILED
  // ===================================================
  if (event.type === "payment_intent.payment_failed") {
    const obj = event.data.object;
    const email =
      obj?.charges?.data?.[0]?.billing_details?.email || obj?.customer_details?.email || null;
    const name =
      obj?.charges?.data?.[0]?.billing_details?.name || obj?.customer_details?.name || "Customer";

    if (email) {
      console.log(`⚠️ Payment failed for ${email}`);
      await sendBrevoEmail({
        toEmail: email,
        toName: name,
        subject: "⚠️ Payment Failed – Please Try Again",
        template: "payment_failed",
      });
    }
  }

  // ===================================================
  // 🕓 3. CANCELED / EXPIRED CHECKOUT
  // ===================================================
  if (["checkout.session.expired", "checkout.session.canceled"].includes(event.type)) {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const name = session.customer_details?.name || "Customer";

    if (email) {
      console.log(`🟨 Checkout canceled/expired for ${email}`);
      await sendBrevoEmail({
        toEmail: email,
        toName: name,
        subject: "⏳ You didn’t finish your €1.99 cover letter",
        template: "letter_ready",
      });
    }
  }

  res.json({ received: true });
});

// ===================================================
// 🌐 Middleware
// ===================================================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===================================================
// 💳 STRIPE CHECKOUT
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
    console.error("❌ Stripe session error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===================================================
// 📧 TEST EMAIL ENDPOINT (Dynamic Template Tester)
// ===================================================
app.get("/api/test-email", async (req, res) => {
  const template = req.query.template || "letter_ready";
  const subjectMap = {
    payment_success: "✅ Test: Payment Successful – Your Cover Letter Is Ready!",
    payment_failed: "⚠️ Test: Payment Failed – Please Try Again",
    letter_ready: "📄 Test: Your Cover Letter Is Ready!",
  };

  try {
    await sendBrevoEmail({
      toEmail: "sforde08@gmail.com",
      toName: "Stephen",
      subject: subjectMap[template] || "QuickCoverLetter Test",
      template,
    });

    console.log(`✅ Test email sent using template: ${template}`);
    res.send(`✅ Test email sent: ${template}`);
  } catch (err) {
    console.error("❌ Test email error:", err.message);
    res.status(500).send("Failed to send test email");
  }
});

// ===================================================
// 🩺 BACKEND STATUS CHECK
// ===================================================
app.get("/api/status", async (req, res) => {
  const status = {
    status: "ok",
    stripe: "connected",
    brevo: "connected",
    supabase: supabase ? "connected" : "not_configured",
    domain: process.env.DOMAIN || "not_set",
    time: new Date().toISOString(),
  };

  try {
    // quick sanity check: test Stripe key validity
    await stripe.products.list({ limit: 1 });
  } catch {
    status.stripe = "error";
  }

  try {
    // basic Brevo test: verify API key presence
    if (!process.env.BREVO_API_KEY) status.brevo = "missing_key";
  } catch {
    status.brevo = "error";
  }

  res.json(status);
});

// ===================================================
// 🚀 Start Server
// ===================================================
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
