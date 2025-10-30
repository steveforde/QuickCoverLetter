import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./email.js";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// --- Supabase Setup ---
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ztrsuveqeftmgoeiwjgz.supabase.co";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // serve your frontend (index.html etc.)


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // ⬅️ serve files from the root (since everything’s at same level)

// Create Stripe checkout session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: "price_1SIkTMQRh7jNBCuPMjkvpyFh", // €1.99
          quantity: 1,
        },
      ],
      success_url: "https://quickcoverletter-backend.onrender.com/success.html",
      cancel_url: "https://quickcoverletter-backend.onrender.com/cancel.html",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: "Payment setup failed" });
  }
});

// Stripe webhook
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("Webhook verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_details?.email || "unknown";

      try {
        await supabase.from("transactions").insert([
          {
            email,
            amount: session.amount_total / 100,
            payment_status: "paid",
            created_at: new Date(),
          },
        ]);

        const html = `
        <div style="font-family:Arial,sans-serif;text-align:center;padding:20px;">
          <h2 style="color:#0070f3;">QuickCoverLetter</h2>
          <p>🎉 Payment successful! You can now create and download your letter.</p>
          <a href="https://quickcoverletter-backend.onrender.com"
            style="background:#0070f3;color:white;padding:10px 20px;text-decoration:none;border-radius:8px;">
            Start Writing
          </a>
        </div>`;

        await sendEmail(email, "✅ QuickCoverLetter Ready", html);
        console.log("✅ Email sent to", email);
      } catch (err) {
        console.error("Webhook DB/Email error:", err.message);
      }
    }

    res.status(200).json({ received: true });
  }
);

app.get("/api/health", (req, res) => res.send("Server OK ✅"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
