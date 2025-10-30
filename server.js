import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./email.js"; // Assume email.js is also updated and exists

dotenv.config();

// =========================================================================
// 1. ENVIRONMENT VARIABLE SETUP & CRITICAL CHECK
// =========================================================================

const PORT = process.env.PORT || 10000;
const DOMAIN = process.env.DOMAIN; 

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PRICE_ID = process.env.PRICE_ID; 

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const EMAIL_FROM = process.env.EMAIL_FROM; // Used by email.js

// CRITICAL CHECK: Ensure all necessary environment variables are present before initializing services
if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DOMAIN || !PRICE_ID || !EMAIL_FROM || !STRIPE_WEBHOOK_SECRET) {
    console.error("FATAL: One or more required environment variables are missing.");
    console.error("Check STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE, DOMAIN, PRICE_ID, EMAIL_FROM, STRIPE_WEBHOOK_SECRET.");
    // Exit the application if essential configuration is missing
    process.exit(1); 
}


const app = express();
const stripe = new Stripe(STRIPE_SECRET_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);


// ========================================================
// 🪝 STRIPE WEBHOOK  (must be before express.json() for raw body)
// ========================================================
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("⚡ Stripe webhook hit");
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_WEBHOOK_SECRET // Use validated variable
      );
    } catch (err) {
      console.error("❌ Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Handle checkout success
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email =
        session.customer_details?.email || session.customer_email || null;
      const name = session.customer_details?.name || "Customer";
      
      // 💡 Get amount directly in cents/units
      const amountInCents = session.amount_total; 

      console.log(`🧾 Checkout complete for ${email}`);

      // Optional: save transaction to Supabase
      const { error } = await supabase.from("transactions").insert([
        {
          payment_intent: session.id,
          email,
          name,
          // 🛠️ Using amountInCents to match integer column type (cents)
          amount: amountInCents, 
          currency: session.currency,
          status: session.payment_status,
          created_at: new Date(),
        },
      ]);
      if (error) console.error("❌ DB insert error:", error.message);

      // ✅ Send Brevo confirmation email using the imported function
      const subject = "QuickProCV Purchase Confirmation";
      const html = `<p>Hi ${name}, thank you for your purchase of ${session.currency.toUpperCase()} ${amountInCents / 100}!</p>`;
      
      await sendEmail(email, subject, html); 
    }

    res.json({ received: true });
  }
);

// ========================================================
// 🧰 MIDDLEWARE & STATIC
// ========================================================
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ========================================================
// 💳 STRIPE CHECKOUT SESSION
// ========================================================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: PRICE_ID, // Use validated variable
          quantity: 1,
        },
      ],
      // FIX: Append session_id placeholder for client-side use
      success_url: `${DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`, 
      cancel_url: `${DOMAIN}/cancel.html`,
      customer_email: req.body.email || undefined,
      // Pass the user's email directly into the metadata for easy webhook retrieval
      metadata: {
          user_email: req.body.email,
          feature: 'premium_templates'
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// 🔍 TEST EMAIL ENDPOINT (Unified to use sendEmail)
// ========================================================
app.get("/api/test-email", async (req, res) => {
  try {
    // Send a simple test email using the imported function
    await sendEmail("sforde08@gmail.com", "API Test Email", "<p>This is a test email sent via the unified Brevo API function.</p>");
    res.send("✅ Test email sent successfully");
  } catch (err) {
    // This logs the full axios error received from the Brevo API
    console.error("❌ Failed to send test email (API Error):", err.message);
    res.status(500).send("❌ Email send failed");
  }
});

// ========================================================
// 🏠 ROOT
// ========================================================
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// ========================================================
// 🚀 START SERVER
// ========================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
