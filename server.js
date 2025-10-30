import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import stripe from 'stripe';
import bodyParser from 'body-parser';
import axios from 'axios';
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const stripe = new stripe(process.env.STRIPE_SECRET_KEY);

// TEMPORARY FIX: Hardcoding SUPABASE_URL because Render environment variables failed to load it.
// The SUPABASE_SERVICE_ROLE (secret key) remains loaded via process.env.
const SUPABASE_URL_HARDCODED = 'https://ztrsuveqeftmgoeiwjgz.supabase.co';

// Note: The service role key is still loaded securely via environment variables.
const supabase = createClient(
    SUPABASE_URL_HARDCODED,
    process.env.SUPABASE_SERVICE_ROLE
);

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
      
      // Get amount directly in cents/units (e.g., 199)
      const amountInCents = session.amount_total;

      console.log(`🧾 Checkout complete for ${email}`);

      // Optional: save transaction to Supabase
      const { error } = await supabase.from("transactions").insert([
        {
          payment_intent: session.id,
          email,
          name,
          // 🛠️ FIX: Use amount in CENTS (integer) to avoid DB decimal error
          amount: amountInCents,
          currency: session.currency,
          status: session.payment_status,
          created_at: new Date(),
        },
      ]);
      if (error) console.error("❌ DB insert error:", error.message);

      // ✅ Send Brevo confirmation email
      await sendBrevoConfirmation(email, name);
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
          price: process.env.PRICE_ID, // e.g. price_1Txxxxxx from your Stripe Dashboard
          quantity: 1,
        },
      ],
      success_url: `${process.env.DOMAIN}/success.html`,
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
// ✉️ BREVO EMAIL FUNCTION
// ========================================================
const sendBrevoConfirmation = async (email, name) => {
  if (!email) return console.warn("⚠️ No email to send Brevo confirmation.");
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        to: [{ email }],
        templateId: 1, // your active Brevo template ID
        params: { name },
        sender: {
          name: "QuickProCV Support",
          email: process.env.EMAIL_FROM,
        },
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Brevo email sent to:", email);
  } catch (err) {
    console.error(
      "❌ Brevo email failed:",
      err.response?.data || err.message
    );
  }
};

// ========================================================
// 🔍 TEST EMAIL ENDPOINT
// ========================================================
app.get("/api/test-email", async (req, res) => {
  try {
    await sendBrevoConfirmation("sforde08@gmail.com", "Test User");
    res.send("✅ Test email sent successfully");
  } catch (err) {
    console.error("❌ Failed to send test email:", err.message);
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
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}. Database fixed.`); // Updated log message
});
