import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());

// ✅ Allow both your frontend and localhost to talk to backend
app.use(
  cors({
    origin: ['https://quickcoverletter.onrender.com', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  })
);

// --- HEALTH CHECK ROUTE ---
app.get('/', (req, res) => {
  res.send('✅ QuickCoverLetter backend running');
});

// --- STRIPE CHECKOUT SESSION ROUTE ---
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: 'price_1SIkTMQRh7jNBCuPMjkvpyFh', // your Stripe price ID
          quantity: 1,
        },
      ],
      success_url: 'https://quickcoverletter.onrender.com/success.html',
      cancel_url: 'https://quickcoverletter.onrender.com/',
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
