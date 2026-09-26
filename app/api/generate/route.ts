export async function POST(req: Request) {
  const { topic, details, link, hashtags } = await req.json();
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "GROQ_API_KEY is not set in Vercel environment variables." }, { status: 500 });
  if (!topic || !String(topic).trim()) return Response.json({ error: "Please describe what you're announcing." }, { status: 400 });

  const system = `You write short marketing social media posts for a product called Vasukii.
Tone: confident, clear, friendly. No hype words like "revolutionary" or "game-changing". Always end with a short call to action.
Weave in the link and hashtags naturally if given, otherwise omit them.
Respond with ONLY raw JSON, no markdown fences, no extra text, in exactly this shape:
{"mastodon":"...","bluesky":"...","discord":"...","telegram":"..."}
Hard character limits you must respect: bluesky <= 260, mastodon <= 450, discord <= 800, telegram <= 800.
Make each version read naturally for its platform, not just a trimmed copy of another.`;

  const user = `Announcement: ${topic}\nDetails: ${details || "none given"}\nLink: ${link || "none"}\nHashtags: ${hashtags || "none"}`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.7,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return Response.json({ error: `Groq API error ${r.status}: ${t.slice(0, 200)}` }, { status: 502 });
    }
    const data = await r.json();
    let text: string = data.choices?.[0]?.message?.content || "{}";
    text = text.replace(/```json|```/g, "").trim();
    const start = text.indexOf("{"), end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
    const parsed = JSON.parse(text);
    for (const k of ["mastodon", "bluesky", "discord", "telegram"]) {
      if (typeof parsed[k] !== "string" || !parsed[k].trim()) throw new Error(`Missing "${k}" in AI response`);
    }
    return Response.json(parsed);
  } catch (e: any) {
    return Response.json({ error: `Could not generate text: ${e.message}` }, { status: 500 });
  }
}
