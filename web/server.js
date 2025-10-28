import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

console.log('🔐 Stripe key loaded:', !!process.env.STRIPE_SECRET_KEY);
console.log('🏷️ PRICE_ID:', process.env.PRICE_ID);
console.log('🌐 DOMAIN:', process.env.DOMAIN);

// ⚠️ Stripe webhook must be placed BEFORE express.json()
// (because Stripe needs raw body for signature verification)
app.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { id, amount_total, currency, customer_email } = session;

      // 💾 Save to Supabase
      const { error } = await supabase.from('transactions').insert([
        {
          stripe_session_id: id,
          amount: amount_total / 100, // convert cents to €
          currency: currency,
          email: customer_email || null,
          status: 'paid',
          created_at: new Date(),
        },
      ]);

      if (error) {
        console.error('❌ Error saving to Supabase:', error);
        return res.status(500).send('Database error');
      }

      console.log(
        `✅ Transaction saved for ${customer_email || 'unknown'} — €${
          amount_total / 100
        }`
      );
    }

    res.json({ received: true });
  }
);

// ✅ Normal middleware comes after webhook
app.use(
  cors({
    origin: ['https://quickcoverletter.onrender.com', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  })
);
app.use(express.json());

// 👇 Serve your frontend from the "public" folder
app.use(express.static('public'));

// Optional: root route to index.html explicitly
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// === Stripe Checkout ===
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
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe error:', err);
    res.status(500).json({ error: 'Payment failed' });
  }
});

// === Example API route ===
app.post('/api/generate', (req, res) => {
  // ... your AI or letter generation logic here ...
  res.json({ letter: 'Generated cover letter goes here' });
});

// === Start server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
