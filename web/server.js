import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔐 Stripe key loaded:', !!process.env.STRIPE_SECRET_KEY);
console.log('🏷️ PRICE_ID:', process.env.PRICE_ID);
console.log('🌐 DOMAIN:', process.env.DOMAIN);

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

// === API route example (if needed)
app.post('/api/generate', (req, res) => {
  // ... your AI or letter generation logic here ...
  res.json({ letter: 'Generated cover letter goes here' });
});

// === Start server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
