import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./email.js";
import path from "path"; 
import { fileURLToPath } from "url"; 

// DEFINE __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Define a safe fallback URL for Supabase initialization
const SUPABASE_FALLBACK_URL = "https://pjrqqrxlzbpjkpxligup.supabase.co"; 

let supabase;

// 🛠️ FIX: Wrap Supabase initialization in try/catch to prevent server crash 
// if environment variables are missing.
try {
  // Use environment variable if available, otherwise use the fallback URL.
  const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_FALLBACK_URL;
  
  // The service role MUST be present in the environment for the backend 
  // to log webhooks.
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseServiceRole) {
    console.warn("⚠️ SUPABASE_SERVICE_ROLE is MISSING. Webhook database logging will fail.");
  }
  
  supabase = createClient(
    supabaseUrl,
    supabaseServiceRole || "fallback_key_that_will_fail_but_not_crash" 
  );
  
} catch (e) {
  console.error("❌ Fatal error during Supabase initialization:", e.message);
}


// ========================================================
// 🪝 STRIPE WEBHOOK  (must be before express.json())
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
        process.env.STRIPE_WEBHOOK_SECRET
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
      const amountInCents = session.amount_total; 

      console.log(`🧾 Checkout complete for ${email}`);

      // Optional: save transaction to Supabase
      if (supabase && supabase.from) {
        const { error } = await supabase.from("transactions").insert([
          {
            payment_intent: session.id,
            email,
            name,
            amount: amountInCents, 
            currency: session.currency,
            status: session.payment_status,
            created_at: new Date(),
          },
        ]);
        if (error) console.error("❌ DB insert error:", error.message);
      } else {
        console.warn("⚠️ Supabase client not fully initialized. Cannot log transaction.");
      }

      // ✅ Send Brevo confirmation email
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

// 🛠️ FIX: Serve static files directly from the root (__dirname). 
// This line handles serving index.html for the root path ('/') automatically.
app.use(express.static(__dirname)); 


// ========================================================
// 💳 STRIPE CHECKOUT SESSION
// ========================================================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: process.env.PRICE_ID, 
          quantity: 1,
        },
      ],
      // CRITICAL FIX: Add session_id parameter for client-side unlocking
      success_url: `${process.env.DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`, 
      cancel_url: `${process.env.DOMAIN}/cancel.html`,
      customer_email: req.body.email || undefined,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// ========================================================
// 🔍 TEST EMAIL ENDPOINT
// ========================================================
app.get("/api/test-email", async (req, res) => {
  try {
    await sendEmail("sforde08@gmail.com", "API Test Email", "<p>This is a test email sent via the unified Brevo API function.</p>");
    res.send("✅ Test email sent successfully");
  } catch (err) {
    console.error("❌ Failed to send test email (API Error):", err.message);
    res.status(500).send("❌ Email send failed");
  }
});


// 🚀 START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
