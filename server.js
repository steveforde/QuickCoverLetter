import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './email.js';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// 🪝 Webhook route - must come BEFORE express.json()
// 🪝 Webhook route
app.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    console.log('⚡ Webhook hit');
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('❌ Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Only process the events you need
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('🧾 Session details:', session);

      const customerEmail = session.customer_details?.email || session.customer_email || null;
      const customerName = session.customer_details?.name || null;

      const { error } = await supabase.from('transactions').insert([
        {
          payment_intent: session.id,
          email: customerEmail,
          name: customerName,
          amount: session.amount_total / 100,
          currency: session.currency,
          status: session.payment_status,
          created_at: new Date(),
        },
      ]);

      if (error) {
        console.error('❌ DB insert error:', error);
      } else {
        console.log(`✅ Transaction saved to Supabase for ${customerEmail || 'unknown'}`);
      }
    } else {
      // 👇 Optional: ignore everything else silently
      console.log(`ℹ️ Ignored event: ${event.type}`);
    }

    res.json({ received: true });
  }
);


app.get("/api/test-email", async (req, res) => {
  try {
    await sendEmail("sforde08@gmail.com", "Test Email", "<p>This is a test</p>");
    res.send("✅ Test email sent successfully");
  } catch (err) {
    console.error("❌ Failed to send email:", err);
    res.status(500).send("❌ Email send failed");
  }
});




// 🧰 Middleware for the rest of the app
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 🛒 Checkout route
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: process.env.PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.DOMAIN}/success.html`,
      cancel_url: `${process.env.DOMAIN}/cancel.html`,
      customer_email: req.body.email || undefined, // optional if you're collecting email on frontend
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🏡 Root route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
