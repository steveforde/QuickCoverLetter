import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// serve static files (your index.html, script.js, style.css)
app.use(express.static('public'));

// API route for generating the cover letter
app.post('/api/generate', async (req, res) => {
  const { jobTitle, companyName, userName, tone } = req.body;

  if (!jobTitle || !companyName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional cover letter writer.' },
        {
          role: 'user',
          content: `Write a ${tone} cover letter for ${userName || 'the applicant'} applying for the ${jobTitle} role at ${companyName}. Keep it short, clear, and professional.`
        }
      ]
    });

    const letter = completion.choices[0].message.content;
    res.json({ coverLetter: letter });
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Failed to generate letter' });
  }
});

// Use PORT for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
