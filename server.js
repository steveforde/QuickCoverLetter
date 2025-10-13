import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST route for generating cover letters
app.post("/generate-letter", async (req, res) => {
  try {
    const { jobTitle, companyName, tone } = req.body;

    const prompt = `Write a ${tone} cover letter for the job title "${jobTitle}" at the company "${companyName}". 
    Keep it short (about 150 words) and sign it with "Stephen Forde".`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional cover letter writer." },
        { role: "user", content: prompt },
      ],
    });

    const aiText = response.choices[0].message.content;
    res.json({ letter: aiText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate letter." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
