export async function POST(req: Request) {
  const { text, limit, platform } = await req.json();
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "GROQ_API_KEY is not set in Vercel environment variables." }, { status: 500 });
  if (!text || !String(text).trim()) return Response.json({ error: "No text given." }, { status: 400 });
  const max = Number(limit) || 260;

  const system = `Rewrite the given social media post so it is under ${max} characters, for ${platform || "a social platform"}.
Keep the same meaning and tone, and keep any link and hashtags exactly as they are.
Respond with ONLY the rewritten post text - no quotes, no explanation, no markdown.`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "system", content: system }, { role: "user", content: text }],
        temperature: 0.5,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return Response.json({ error: `Groq API error ${r.status}: ${t.slice(0, 200)}` }, { status: 502 });
    }
    const data = await r.json();
    const out = (data.choices?.[0]?.message?.content || "").trim().replace(/^"|"$/g, "");
    if (!out) throw new Error("Empty response");
    return Response.json({ text: out });
  } catch (e: any) {
    return Response.json({ error: `Could not shorten: ${e.message}` }, { status: 500 });
  }
}
