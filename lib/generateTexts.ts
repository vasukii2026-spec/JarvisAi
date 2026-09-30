export type GeneratedTexts = { mastodon: string; bluesky: string; discord: string; telegram: string; headline?: string };

export async function generateTexts(opts: {
  topic: string; details?: string; link?: string; hashtags?: string; language?: string;
}): Promise<GeneratedTexts> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set in Vercel environment variables.");
  if (!opts.topic?.trim()) throw new Error("No topic given.");

  const lang = (opts.language || "English").trim();
  const system = `You write short marketing social media posts for a product called Vasukii.
Tone: confident, clear, friendly. No hype words like "revolutionary" or "game-changing". Always end with a short call to action.
Weave in the link and hashtags naturally if given, otherwise omit them.
Write every post in ${lang}. Keep hashtags and the link as given, don't translate those, but the surrounding sentences must be in ${lang}.
CRITICAL SAFETY RULE: never invent or imply specific prices, price predictions, percentage gains, guarantees, holder counts,
or any other specific statistic or financial claim that was not explicitly given to you. If none were given, don't make any up -
write about the community, the product philosophy, or general engagement instead.
Respond with ONLY raw JSON, no markdown fences, no extra text, in exactly this shape:
{"mastodon":"...","bluesky":"...","discord":"...","telegram":"...","headline":"..."}
"headline" is a short punchy title, 6 words or fewer, suitable as a big headline on an image - not a full sentence.
Hard character limits you must respect: bluesky <= 260, mastodon <= 450, discord <= 800, telegram <= 800.
Make each version read naturally for its platform, not just a trimmed copy of another.`;

  const user = `Topic: ${opts.topic}\nDetails: ${opts.details || "none given"}\nLink: ${opts.link || "none"}\nHashtags: ${opts.hashtags || "none"}`;

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.7,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Groq API error ${r.status}: ${t.slice(0, 200)}`);
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
  return parsed;
}
