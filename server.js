// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate", async (req, res) => {
  const { jobTitle, companyName, userName, tone } = req.body;

  if (!jobTitle || !companyName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional cover letter writer." },
        {
          role: "user",
          content: `Write a ${tone} cover letter for ${userName || "the applicant"} applying for the ${jobTitle} role at ${companyName}. Keep it short, professional, and clear.`,
        },
      ],
    });

    res.json({ letter: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate cover letter" });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
