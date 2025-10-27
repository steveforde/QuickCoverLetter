import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();
const app = express();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/generate', (req, res) => {
  const { jobTitle, companyName, tone, name } = req.body;

  if (!jobTitle || !companyName || !name) {
    return res
      .status(400)
      .json({ error: 'Missing job title, company name, or name' });
  }

  const sampleLetter = `
Dear Hiring Manager,

I am excited to apply for the ${jobTitle} position at ${companyName}. 
With strong communication skills and a ${tone || 'professional'} attitude, 
I’m confident I can contribute positively to your team.

Kind regards,  
${name}
`;

  res.json({ letter: sampleLetter.trim() });
});

// === COVER LETTER GENERATOR ROUTE ===

app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: 'price_1SIkTMQRh7jNBCuPMjkvpyFh', // ✅ use your real Stripe price ID
          quantity: 1,
        },
      ],
      success_url: 'https://quickcoverletter.onrender.com/success.html',
      cancel_url: 'https://quickcoverletter.onrender.com/',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// === SERVER START ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
