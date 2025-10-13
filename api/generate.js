import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobTitle, companyName, tone, userName } = req.body;

  if (!jobTitle || !companyName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
    Write a ${tone} cover letter for the position of ${jobTitle} at ${companyName}.
    Personalize it using the applicant's name: ${userName || "Candidate"}.
    Keep it concise (around 150–200 words), friendly but professional.
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const coverLetter = completion.choices[0].message.content;
    return res.status(200).json({ coverLetter });
  } catch (error) {
    console.error("❌ Error in /api/generate:", error);
    return res.status(500).json({ error: "Failed to generate cover letter" });
  }
}
