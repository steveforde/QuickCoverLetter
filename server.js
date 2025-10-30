import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./email.js";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// === SUPABASE SETUP ===
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ztrsuveqeftmgoeiwjgz.supabase.co";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());

// ✅ Serve frontend files from root (index.html, style.css, script.js)
app.use(express.static("."));

// === STRIPE CHECKOUT ===
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: "price_1SIkTMQRh7jNBCuPMjkvpyFh", // your €1.99 price ID
          quantity: 1,
        },
      ],
      success_url: "https://quickcoverletter.onrender.com/success.html",
      cancel_url: "https://quickcoverletter.onrender.com/cancel.html",
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err.message);
    res.status(500).json({ error: "Stripe session failed" });
  }
});

// === STRIPE WEBHOOK (sends email after payment) ===
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const event = req.body;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_details.email;

      // store payment in Supabase
      await supabase.from("transactions").insert({
        email,
        payment_status: "paid",
        amount: 1.99,
        created_at: new Date().toISOString(),
      });

      // send success email
      await sendEmail(
        email,
        "✅ Your QuickCoverLetter is ready to generate",
        `
        <div style="font-family:sans-serif;text-align:center;padding:40px;background:#f6f8fb">
          <h2 style="color:#0070f3;margin-bottom:8px;">QuickCoverLetter</h2>
          <p>🎉 Payment Successful!</p>
          <p>You now have full access to create and download your professional letter.</p>
          <a href="https://quickcoverletter.onrender.com"
             style="background:#0070f3;color:white;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:15px;">
             Go to QuickCoverLetter
          </a>
        </div>`
      );
    }

    res.status(200).send("ok");
  }
);

// === CATCH-ALL (refreshing routes always loads index.html) ===
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "." });
});

// === START SERVER ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 QuickCoverLetter backend running on port ${PORT}`)
);
