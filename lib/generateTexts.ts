const DOMAIN = "vasukii.xyz";

export type GeneratedTexts = { mastodon: string; bluesky: string; discord: string; telegram: string; headline?: string };

export async function generateTexts(opts: {
  topic: string; details?: string; link?: string; hashtags?: string; language?: string;
}): Promise<GeneratedTexts> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set in Vercel environment variables.");
  if (!opts.topic?.trim()) throw new Error("No topic given.");

  const lang = (opts.language || "English").trim();
  const system = `You write short social media posts for a product called Vasukii.
Every post MUST follow this 3-part persuasion structure, in this order, as flowing sentences (no labels, no "Logos:" / "Ethos:" / "Pathos:" words in the text):
1) LOGOS (logic): one clear, rational point about what Vasukii is or why the topic makes sense - a simple fact about the product or an easy-to-follow reason.
2) ETHOS (credibility/trust): one line that builds trust - transparency, community-first values, official channels only, the 'Connect, Share, Evolve' philosophy. Never fake credentials, awards, partnerships or numbers.
3) PATHOS (emotion): one warm, human line that makes the reader feel something - belonging, hope, curiosity, being part of something growing. End with a short call to action (this is the closing of the pathos part).
DOMAIN RULE: the website vasukii.xyz MUST appear in EVERY paragraph / every part of EVERY post (written exactly as vasukii.xyz, no https://, no changes). Short posts with one paragraph must contain it at least once. Never write any other domain (never vasukii.com).\nTone: confident, clear, friendly, human. No hype words like "revolutionary" or "game-changing".
Weave in the link and hashtags naturally if given, otherwise omit them.
Write every post in ${lang}. Keep hashtags and the link as given, don't translate those, but the surrounding sentences must be in ${lang}.
CRITICAL SAFETY RULE: never invent or imply specific prices, price predictions, percentage gains, guarantees, holder counts,
or any other specific statistic or financial claim that was not explicitly given to you. If none were given, don't make any up -
write about the community, the product philosophy, or general engagement instead.
Respond with ONLY raw JSON, no markdown fences, no extra text, in exactly this shape:
{"mastodon":"...","bluesky":"...","discord":"...","telegram":"...","headline":"..."}
"headline" is a short punchy title, 6 words or fewer, suitable as a big headline on an image - not a full sentence.
Hard character limits you must respect: bluesky <= 260, mastodon <= 450, discord <= 800, telegram <= 800.
Length guide: bluesky = one short sentence per part (3 total). mastodon = 1-2 sentences per part. discord and telegram = a short paragraph per part, separated by a blank line (\\n\\n) so the 3 parts are visible.
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
  // Safety net: the AI sometimes forgets. Make sure every paragraph of every post mentions the domain.
  const limits: Record<string, number> = { bluesky: 260, mastodon: 450, discord: 800, telegram: 800 };
  for (const k of ["mastodon", "bluesky", "discord", "telegram"]) {
    parsed[k] = ensureDomain(parsed[k], limits[k]);
  }
  return parsed;
}

function ensureDomain(text: string, limit: number): string {
  const paras = text.trim().split(/\n{2,}/).map((x: string) => x.trim()).filter(Boolean);
  const fixed = paras.map((para: string) => {
    const withoutVasukiiCom = para.replace(/vasukii\.com/gi, DOMAIN);
    return withoutVasukiiCom.toLowerCase().includes(DOMAIN) ? withoutVasukiiCom : `${withoutVasukiiCom} ${DOMAIN}`;
  });
  let out = fixed.join("\n\n");
  // If adding the domain pushed it over the platform limit, trim the longest paragraph's words (keeping the domain).
  while (out.length > limit) {
    let idx = 0;
    fixed.forEach((x: string, i: number) => { if (x.length > fixed[idx].length) idx = i; });
    const words = fixed[idx].split(" ");
    if (words.length < 4) break;
    const di = words.findIndex((w: string) => w.toLowerCase().includes(DOMAIN));
    // drop the last word that isn't the domain
    let drop = words.length - 1;
    if (drop === di) drop--;
    words.splice(drop, 1);
    fixed[idx] = words.join(" ");
    out = fixed.join("\n\n");
  }
  return out;
}
