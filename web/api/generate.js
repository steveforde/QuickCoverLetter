import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobTitle, companyName, userName, tone } = req.body;

  if (!jobTitle || !companyName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const letter = completion.choices[0].message?.content || "No content generated";
    res.status(200).json({ coverLetter: letter });
  } catch (err) {
    console.error("❌ OpenAI error:", err);
    res.status(500).json({ error: "Failed to generate letter" });
  }
}
