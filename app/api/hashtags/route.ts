export async function POST(req: Request) {
  const { topic, details } = await req.json();
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "GROQ_API_KEY is not set in Vercel environment variables." }, { status: 500 });
  if (!topic || !String(topic).trim()) return Response.json({ error: "Give a topic first." }, { status: 400 });

  const system = `You suggest social media hashtags for a crypto/product brand called Vasukii.
Given a topic and details, respond with ONLY a raw JSON array of 6 to 8 short hashtags, most relevant first.
Each hashtag starts with # and has no spaces. No explanations, no markdown fences.
Example: ["#Vasukii","#Crypto","#Web3","#TokenLaunch"]`;
  const user = `Topic: ${topic}\nDetails: ${details || "none given"}`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.6,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return Response.json({ error: `Groq API error ${r.status}: ${t.slice(0, 200)}` }, { status: 502 });
    }
    const data = await r.json();
    let text: string = data.choices?.[0]?.message?.content || "[]";
    text = text.replace(/```json|```/g, "").trim();
    const start = text.indexOf("["), end = text.lastIndexOf("]");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
    const tags = JSON.parse(text).filter((t: any) => typeof t === "string" && t.startsWith("#"));
    if (!tags.length) throw new Error("No usable hashtags returned");
    return Response.json({ hashtags: tags });
  } catch (e: any) {
    return Response.json({ error: `Could not suggest hashtags: ${e.message}` }, { status: 500 });
  }
}
