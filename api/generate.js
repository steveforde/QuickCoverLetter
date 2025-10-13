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

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a ${tone} cover letter for ${userName || "the applicant"} applying for the ${jobTitle} role at ${companyName}. Keep it concise, professional and personal.`,
        },
      ],
    });

    const letter = completion.choices[0].message.content;
    return res.status(200).json({ coverLetter: letter });
  } catch (err) {
    console.error("❌ API error:", err);
    return res.status(500).json({ error: "Server failed to generate letter" });
  }
}

