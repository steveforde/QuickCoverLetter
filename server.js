import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import brevo from "@getbrevo/brevo";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Brevo
const brevoClient = new brevo.TransactionalEmailsApi();
brevoClient.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

// Supabase
const SUPABASE_URL = "https://ztrsuveqeftmgoeiwjgz.supabase.co";
let supabase = null;
try {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (serviceRole) {
    supabase = createClient(SUPABASE_URL, serviceRole);
  } else {
    console.warn("SUPABASE_SERVICE_ROLE missing");
  }
} catch (e) {
  console.error("Supabase init failed:", e.message);
}

// STRIPE WEBHOOK
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook sig failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email || null;
      const name = session.customer_details?.name || "Customer";
      const amountInCents = session.amount_total;

      console.log(`Payment: ${email}`);

      // Save to DB
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
        if (error) console.error("DB error:", error.message);
      }

      // SEND EMAIL (HTML ONLY)
      try {
        const response = await brevoClient.sendTransacEmail({
          sender: { name: "QuickCoverLetter", email: "hello@quickcoverletter.com" },
          to: [{ email, name }],
          subject: "Your Cover Letter is Ready!",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background: #f9f9f9;">
              <h2 style="color: #2563eb;">Hi ${name}!</h2>
              <p>Your payment of <strong>€${(amountInCents / 100).toFixed(2)}</strong> was successful!</p>
              <p>Your cover letters are now <strong>unlocked</strong>.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.DOMAIN}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Generate Your Letter Now
                </a>
              </p>
              <p>Thanks for using <strong>QuickCoverLetter</strong>!</p>
            </div>
          `,
        });
        console.log("EMAIL SENT (HTML):", response);
      } catch (err) {
        console.error("BREVO ERROR:", err.response?.body || err.message);
      }
    }

    res.json({ received: true });
  }
);

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// CHECKOUT
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
    res.status(500).json({ error: err.message });
  }
});

// TEST EMAIL (HTML ONLY)
app.get("/api/test-email", async (req, res) => {
  try {
    await brevoClient.sendTransacEmail({
      sender: { name: "QuickCoverLetter", email: "hello@quickcoverletter.com" },
      to: [{ email: "sforde08@gmail.com", name: "Stephen" }],
      subject: "Test: Cover Letter Ready!",
      htmlContent: `
        <h2>Hi Stephen!</h2>
        <p>This is a <strong>test email</strong> from QuickCoverLetter.</p>
        <p>Payment: €1.99</p>
        <p><a href="${process.env.DOMAIN}">Go to App</a></p>
      `,
    });
    res.send("TEST EMAIL SENT!");
  } catch (err) {
    console.error("TEST FAILED:", err.response?.body || err.message);
    res.status(500).send("Failed");
  }
});

// START
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
