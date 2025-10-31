import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import brevo from "@getbrevo/brevo";
import path from "path";
import { fileURLToPath } from "url";

// DEFINE __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Brevo client globally
const brevoClient = new brevo.TransactionalEmailsApi();
brevoClient.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

// Supabase setup with safe fallback
const SUPABASE_FALLBACK_URL = "https://ztrsuveqeftmgoeiwjgz.supabase.co"; // YOUR CORRECT URL
let supabase;
try {
  const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_FALLBACK_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseServiceRole) {
    console.warn("SUPABASE_SERVICE_ROLE is MISSING. Webhook DB logging will fail.");
  }

  supabase = createClient(
    supabaseUrl,
    supabaseServiceRole || "fallback_key_that_will_fail_but_not_crash"
  );
} catch (e) {
  console.error("Fatal error during Supabase initialization:", e.message);
}

// ========================================================
// STRIPE WEBHOOK (must be before express.json())
// ========================================================
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("Stripe webhook hit");
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // === HANDLE CHECKOUT COMPLETED ===
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email || null;
      const name = session.customer_details?.name || "Customer";
      const amountInCents = session.amount_total;

      console.log(`Checkout complete for ${email}`);

      // Insert into Supabase
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
        if (error) console.error("DB insert error:", error.message);
      }

      // Send Brevo email
      try {
        await brevoClient.sendTransacEmail({
          sender: { name: "QuickCoverLetter Team", email: "hello@quickcoverletter.com" },
          to: [{ email, name }],
          templateId: parseInt(process.env.BREVO_TEMPLATE_ID, 10),
          params: {
            user_name: name,
            amount: (amountInCents / 100).toFixed(2),
          },
        });
        console.log(`Brevo email sent to ${email}`);
      } catch (err) {
        console.error("Email failed:", err.response?.body || err.message);
      }
    }

    // MUST BE OUTSIDE THE IF — tells Stripe "received"
    res.json({ received: true });
  }
);

// ========================================================
// MIDDLEWARE & STATIC
// ========================================================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve frontend

// ========================================================
// STRIPE CHECKOUT SESSION
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
      success_url: `${process.env.DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/cancel.html`,
      customer_email: req.body.email || undefined,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// TEST EMAIL ENDPOINT
// ========================================================
app.get("/api/test-email", async (req, res) => {
  try {
    await brevoClient.sendTransacEmail({
      sender: { name: "QuickCoverLetter Team", email: "hello@quickcoverletter.com" },
      to: [{ email: "sforde08@gmail.com", name: "Stephen" }],
      templateId: parseInt(process.env.BREVO_TEMPLATE_ID, 10),
      params: {
        user_name: "Stephen",
        amount: "1.99",
      },
    });
    res.send("Test Brevo email sent successfully");
  } catch (err) {
    console.error("Test email failed:", err.response?.body || err.message);
    res.status(500).send(`Email send failed: ${err.message}`);
  }
});

// ========================================================
// START SERVER
// ========================================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
