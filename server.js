import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();

// ✅ Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Supabase (Render-safe hardcode)
const SUPABASE_URL_HARDCODED = 'https://ztrsuveqeftmgoeiwjgz.supabase.co';
const supabase = createClient(
  SUPABASE_URL_HARDCODED,
  process.env.SUPABASE_SERVICE_ROLE
);

// 🪝 Stripe Webhook (must come BEFORE express.json)
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
      console.error('❌ Webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        null;
      const customerName = session.customer_details?.name || 'there';

      console.log('✅ Stripe checkout completed for', customerEmail);

      // 🧾 Save transaction to Supabase
      const { error } = await supabase.from('transactions').insert([
        {
          email: customerEmail,
          name: customerName,
          amount: session.amount_total / 100,
          currency: session.currency,
          payment_status: session.payment_status,
          created_at: new Date(),
        },
      ]);

      if (error) {
        console.error('❌ Supabase insert error:', error.message);
      } else {
        console.log(`✅ Transaction saved for ${customerEmail}`);
      }

      // ✅ Send confirmation email
      if (customerEmail) {
        try {
          await sendBrevoConfirmation(customerEmail, customerName);
          console.log('✅ Brevo email sent to', customerEmail);
        } catch (err) {
          console.error('❌ Failed to send Brevo confirmation:', err.message);
        }
      }
    } else {
      console.log('ℹ️ Webhook event ignored:', event.type);
    }

    res.json({ received: true });
  }
);

// 🧰 Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 🧪 Test Email Route
app.get('/api/test-email', async (req, res) => {
  try {
    await sendBrevoConfirmation('sforde08@gmail.com', 'Stephen');
    res.send('✅ Test email sent successfully');
  } catch (err) {
    console.error('❌ Test email failed:', err.response?.data || err.message);
    res.status(500).send('❌ Email send failed');
  }
});

// 💳 Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { email } = req.body;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: process.env.PRICE_ID, // Must exist in your Stripe dashboard
          quantity: 1,
        },
      ],
      success_url: `${process.env.DOMAIN}/success.html`,
      cancel_url: `${process.env.DOMAIN}/`,
      customer_email: email || undefined,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🏡 Root Route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// ✉️ Brevo Send Function
async function sendBrevoConfirmation(email, name) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY missing');

  const payload = {
    to: [{ email }],
    templateId: 1,
    params: { name: name || 'there' },
    sender: {
      name: 'QuickProCV Support',
      email: 'support@quickprocv.com',
    },
  };

  const headers = {
    'api-key': apiKey,
    'Content-Type': 'application/json',
  };

  await axios.post('https://api.brevo.com/v3/smtp/email', payload, { headers });
}

// 🚀 Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
