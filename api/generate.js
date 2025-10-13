export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobTitle, companyName, userName, tone } = req.body;

  if (!jobTitle || !companyName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a professional cover letter writer." },
          {
            role: "user",
            content: `Write a ${tone} cover letter for ${userName} applying for a ${jobTitle} position at ${companyName}.`,
          },
        ],
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenAI API Error:", data.error);
      return res.status(500).json({ error: "OpenAI request failed" });
    }

    const letter = data.choices[0].message.content;
    res.status(200).json({ coverLetter: letter });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
