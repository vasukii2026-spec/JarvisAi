"use client";
import { useState } from "react";

const PLATFORMS = ["mastodon", "bluesky", "discord", "telegram"] as const;
type Platform = (typeof PLATFORMS)[number];
const LIMITS: Record<Platform, number> = { bluesky: 300, mastodon: 500, discord: 2000, telegram: 1024 };

const box: React.CSSProperties = { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #334155",
  background: "#111827", color: "#e2e8f0", marginTop: 6, marginBottom: 16, fontSize: 14 };
const btn: React.CSSProperties = { padding: "10px 18px", borderRadius: 8, border: "none", background: "#38bdf8",
  color: "#0b1220", fontWeight: 700, cursor: "pointer" };

const STYLES = ["bottts", "adventurer", "big-smile", "fun-emoji", "thumbs", "shapes", "rings"];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");
  const [hashtags, setHashtags] = useState("#Vasukii");
  const [style, setStyle] = useState("bottts");
  const [texts, setTexts] = useState<Record<Platform, string> | null>(null);
  const [selected, setSelected] = useState<Platform[]>([...PLATFORMS]);
  const [loading, setLoading] = useState<"" | "gen" | "post">("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<Record<string, string> | null>(null);

  const imgTitle = topic || "Vasukii";
  const imgSubtitle = details.slice(0, 100);
  const imgUrl = `/api/og?title=${encodeURIComponent(imgTitle)}&subtitle=${encodeURIComponent(imgSubtitle)}&tag=${encodeURIComponent(hashtags)}&style=${style}`;

  async function generate() {
    setLoading("gen"); setError(""); setResults(null);
    try {
      const r = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, details, link, hashtags }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Generation failed");
      setTexts(d);
    } catch (e: any) { setError(e.message); }
    setLoading("");
  }

  async function post() {
    if (!texts) return;
    setLoading("post"); setError("");
    try {
      const r = await fetch("/api/post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: selected, texts, image: { title: imgTitle, subtitle: imgSubtitle, tag: hashtags, style } }),
      });
      setResults(await r.json());
    } catch (e: any) { setError(e.message); }
    setLoading("");
  }

  const toggle = (p: Platform) => setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 26 }}>🚀 Vasukii Marketing Poster</h1>
      <p style={{ color: "#94a3b8", marginTop: -8 }}>Write once, review, then post to whichever platforms you approve.</p>

      <label>What are you announcing?</label>
      <input style={box} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. New feature: dark mode" />

      <label>Details / key points</label>
      <textarea style={box} rows={3} value={details} onChange={(e) => setDetails(e.target.value)}
        placeholder="What it does, why it matters, who it's for..." />

      <label>Link (optional)</label>
      <input style={box} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://vasukii.com" />

      <label>Hashtags</label>
      <input style={box} value={hashtags} onChange={(e) => setHashtags(e.target.value)} />

      <label>Mascot style</label>
      <select style={box} value={style} onChange={(e) => setStyle(e.target.value)}>
        {STYLES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <button style={{ ...btn, opacity: !topic || loading ? 0.6 : 1 }} onClick={generate} disabled={!topic || !!loading}>
        {loading === "gen" ? "Writing..." : "Generate paragraph + image"}
      </button>

      {error && <p style={{ color: "#f87171", marginTop: 12 }}>⚠ {error}</p>}

      {texts && (
        <div style={{ marginTop: 32 }}>
          <img src={imgUrl} alt="preview" style={{ width: "100%", borderRadius: 10, border: "1px solid #334155" }} />

          {PLATFORMS.map((p) => (
            <div key={p} style={{ marginTop: 18, padding: 14, border: "1px solid #334155", borderRadius: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, textTransform: "capitalize" }}>
                <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} /> {p}
                <span style={{ marginLeft: "auto", fontWeight: 400, fontSize: 12, color: texts[p].length > LIMITS[p] ? "#f87171" : "#64748b" }}>
                  {texts[p].length}/{LIMITS[p]}
                </span>
              </label>
              <textarea style={{ ...box, marginBottom: 0 }} rows={3} value={texts[p]}
                onChange={(e) => setTexts({ ...texts, [p]: e.target.value })} />
            </div>
          ))}

          <button style={{ ...btn, marginTop: 18, opacity: !selected.length || loading ? 0.6 : 1 }}
            onClick={post} disabled={!selected.length || !!loading}>
            {loading === "post" ? "Posting..." : `✅ Approve & post to ${selected.length} platform(s)`}
          </button>
        </div>
      )}

      {results && (
        <div style={{ marginTop: 24 }}>
          <h3>Result</h3>
          {Object.entries(results).map(([p, r]) => (
            <div key={p}>{r.startsWith("Failed") ? "❌" : "✅"} <b>{p}</b>: {r}</div>
          ))}
        </div>
      )}
    </main>
  );
}
