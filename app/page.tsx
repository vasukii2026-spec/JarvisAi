"use client";
import { useState, useEffect } from "react";

const PLATFORMS = ["mastodon", "bluesky", "discord", "telegram"] as const;
type Platform = (typeof PLATFORMS)[number];
const LIMITS: Record<Platform, number> = { bluesky: 300, mastodon: 500, discord: 2000, telegram: 1024 };
const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Portuguese", "Japanese", "Arabic"];
const LAYOUTS = [
  { id: "classic", label: "Classic (text left, logo right)" },
  { id: "banner", label: "Banner (big centered logo + headline)" },
  { id: "quote", label: "Quote (punchy statement, small badge)" },
  { id: "mascot", label: "Mascot (auto-generated character avatar)" },
];
const MASCOT_STYLES = ["bottts", "adventurer", "big-smile", "fun-emoji", "thumbs", "shapes", "rings"];

const box: React.CSSProperties = { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #334155",
  background: "#111827", color: "#e2e8f0", marginTop: 6, marginBottom: 16, fontSize: 14 };
const btn: React.CSSProperties = { padding: "10px 18px", borderRadius: 8, border: "none", background: "#f97316",
  color: "#0b1220", fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { ...btn, background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155" };
const btnSmall: React.CSSProperties = { ...btnGhost, padding: "4px 10px", fontSize: 12, fontWeight: 500 };
const chip: React.CSSProperties = { ...btnSmall, borderRadius: 999, marginRight: 6, marginBottom: 6 };

type Texts = Record<Platform, string>;

function imageUrlFor(title: string, subtitle: string, tag: string, layout: string, mascotStyle: string, link: string) {
  return `/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(subtitle)}` +
    `&tag=${encodeURIComponent(tag)}&layout=${layout}&style=${mascotStyle}&link=${encodeURIComponent(link)}`;
}

export default function Home() {
  // shared settings (used by both single and batch mode)
  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");
  const [hashtags, setHashtags] = useState("#Vasukii");
  const [language, setLanguage] = useState("English");
  const [layout, setLayout] = useState("classic");
  const [mascotStyle, setMascotStyle] = useState("bottts");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [tagLoading, setTagLoading] = useState(false);
  const [error, setError] = useState("");

  // single-post mode
  const [batchMode, setBatchMode] = useState(false);
  const [topic, setTopic] = useState("");
  const [texts, setTexts] = useState<Texts | null>(null);
  const [selected, setSelected] = useState<Platform[]>([...PLATFORMS]);
  const [loading, setLoading] = useState<"" | "gen" | "post">("");
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [shortening, setShortening] = useState<Platform | null>(null);

  // batch mode
  const [batchTopics, setBatchTopics] = useState("");
  const [batch, setBatch] = useState<{ topic: string; texts: Texts; selected: Platform[]; results: Record<string, string> | null; loading: boolean }[]>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Buffer channels (X, Instagram, ...) - loaded from your Buffer account if BUFFER_API_KEY is set
  const [bufferChannels, setBufferChannels] = useState<{ id: string; name: string; service: string }[]>([]);
  const [bufferSelected, setBufferSelected] = useState<string[]>([]);
  const [bufferError, setBufferError] = useState("");
  // Channel list is cached in the browser for 12h so opening the page doesn't spend Buffer API requests.
  async function loadBufferChannels(force = false) {
    try {
      if (!force) {
        const raw = localStorage.getItem("bufferChannels");
        if (raw) {
          const c = JSON.parse(raw);
          if (Date.now() - c.at < 12 * 60 * 60 * 1000 && Array.isArray(c.channels) && c.channels.length) {
            setBufferChannels(c.channels); return;
          }
        }
      }
    } catch {}
    try {
      const d = await (await fetch("/api/buffer/channels" + (force ? "?refresh=1" : ""))).json();
      setBufferError(d.error || "");
      if (Array.isArray(d.channels)) {
        setBufferChannels(d.channels);
        if (d.channels.length) { try { localStorage.setItem("bufferChannels", JSON.stringify({ at: Date.now(), channels: d.channels })); } catch {} }
      }
    } catch {}
  }
  useEffect(() => { loadBufferChannels(); }, []);
  const bufferKeys = () => bufferSelected.map((id) => {
    const c = bufferChannels.find((x) => x.id === id)!;
    return `buffer:${c.service}:${c.id}`;
  });
  const toggleBuffer = (id: string) => setBufferSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const imgTitle = topic || "Vasukii";
  const imgSubtitle = details.slice(0, 100);
  const imgUrl = imageUrlFor(imgTitle, imgSubtitle, hashtags, layout, mascotStyle, link);

  async function callGenerate(t: string) {
    const r = await fetch("/api/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: t, details, link, hashtags, language }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Generation failed");
    return d as Texts;
  }

  async function generate() {
    setLoading("gen"); setError(""); setResults(null);
    try { setTexts(await callGenerate(topic)); } catch (e: any) { setError(e.message); }
    setLoading("");
  }

  async function post() {
    if (!texts) return;
    setLoading("post"); setError("");
    try {
      const r = await fetch("/api/post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: [...selected, ...bufferKeys()], texts, image: { title: imgTitle, subtitle: imgSubtitle, tag: hashtags, layout, style: mascotStyle, link } }),
      });
      setResults(await r.json());
    } catch (e: any) { setError(e.message); }
    setLoading("");
  }

  async function suggestHashtags() {
    setTagLoading(true); setError("");
    try {
      const r = await fetch("/api/hashtags", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: batchMode ? batchTopics.split("\n")[0] : topic, details }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not suggest hashtags");
      setSuggestedTags(d.hashtags);
    } catch (e: any) { setError(e.message); }
    setTagLoading(false);
  }

  function toggleTag(t: string) {
    const parts = hashtags.split(/\s+/).filter(Boolean);
    setHashtags(parts.includes(t) ? parts.filter((x) => x !== t).join(" ") : [...parts, t].join(" "));
  }

  async function shorten(p: Platform) {
    if (!texts) return;
    setShortening(p); setError("");
    try {
      const r = await fetch("/api/shorten", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: texts[p], limit: LIMITS[p], platform: p }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not shorten");
      setTexts({ ...texts, [p]: d.text });
    } catch (e: any) { setError(e.message); }
    setShortening(null);
  }

  const toggle = (p: Platform) => setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  // ---- batch mode ----
  async function generateBatch() {
    const topics = batchTopics.split("\n").map((t) => t.trim()).filter(Boolean);
    if (!topics.length) return;
    setBatchGenerating(true); setError("");
    setBatch(topics.map((t) => ({ topic: t, texts: null as any, selected: [...PLATFORMS], results: null, loading: true })));
    const items = await Promise.all(topics.map(async (t) => {
      try { return { topic: t, texts: await callGenerate(t), selected: [...PLATFORMS] as Platform[], results: null, loading: false }; }
      catch (e: any) { return { topic: t, texts: null as any, selected: [...PLATFORMS] as Platform[], results: { error: e.message }, loading: false }; }
    }));
    setBatch(items);
    setBatchGenerating(false);
  }

  function updateBatchItem(i: number, patch: Partial<(typeof batch)[number]>) {
    setBatch((b) => b.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  async function postBatchItem(i: number) {
    const item = batch[i];
    if (!item.texts || !(item.selected.length + bufferSelected.length)) return;
    updateBatchItem(i, { loading: true });
    try {
      const r = await fetch("/api/post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: [...item.selected, ...bufferKeys()], texts: item.texts, image: { title: item.topic, subtitle: imgSubtitle, tag: hashtags, layout, style: mascotStyle, link } }),
      });
      updateBatchItem(i, { results: await r.json(), loading: false });
    } catch (e: any) { updateBatchItem(i, { results: { error: e.message }, loading: false }); }
  }

  async function postAllBatch() {
    for (let i = 0; i < batch.length; i++) {
      if (batch[i].texts && (batch[i].selected.length + bufferSelected.length)) await postBatchItem(i);
    }
  }

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 26 }}>🚀 Vasukii Marketing Poster</h1>
      <p style={{ color: "#94a3b8", marginTop: -8 }}>Write once, review, then post to whichever platforms you approve.</p>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <input type="checkbox" checked={batchMode} onChange={(e) => setBatchMode(e.target.checked)} />
        Batch mode (generate several posts at once)
      </label>

      {!batchMode ? (
        <label>What are you announcing?</label>
      ) : (
        <label>Topics - one per line, one post will be generated for each</label>
      )}
      {!batchMode ? (
        <input style={box} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. New feature: dark mode" />
      ) : (
        <textarea style={box} rows={4} value={batchTopics} onChange={(e) => setBatchTopics(e.target.value)}
          placeholder={"New feature: dark mode\nWeekend trading contest\n1000 holders milestone"} />
      )}

      <label>Details / key points {batchMode && "(shared across all topics above)"}</label>
      <textarea style={box} rows={3} value={details} onChange={(e) => setDetails(e.target.value)}
        placeholder="What it does, why it matters, who it's for..." />

      <label>Link (optional - also adds a scannable QR code to the image)</label>
      <input style={box} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://vasukii.com" />

      <label>Hashtags</label>
      <input style={box} value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
      <div style={{ marginTop: -10, marginBottom: 16 }}>
        <button style={btnSmall} onClick={suggestHashtags} disabled={tagLoading || (!topic && !batchTopics)}>
          {tagLoading ? "Thinking..." : "💡 Suggest hashtags"}
        </button>
        {suggestedTags.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {suggestedTags.map((t) => (
              <button key={t} style={{ ...chip, background: hashtags.includes(t) ? "#f97316" : "#1e293b",
                color: hashtags.includes(t) ? "#0b1220" : "#e2e8f0" }} onClick={() => toggleTag(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label>Language</label>
          <select style={box} value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Image layout</label>
          <select style={box} value={layout} onChange={(e) => setLayout(e.target.value)}>
            {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
      </div>

      {layout === "mascot" && (
        <>
          <label>Mascot style</label>
          <select style={box} value={mascotStyle} onChange={(e) => setMascotStyle(e.target.value)}>
            {MASCOT_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </>
      )}

      <div style={{ marginBottom: 16, padding: 14, border: "1px solid #334155", borderRadius: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Also post via Buffer (X, Instagram, LinkedIn...)</div>
        {bufferChannels.length === 0 ? (
          <div style={{ fontSize: 13, color: bufferError ? "#f87171" : "#64748b" }}>
            {bufferError || "No Buffer channels found. Add BUFFER_API_KEY in your environment variables and connect channels in Buffer."}
          </div>
        ) : (
          bufferChannels.map((c) => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, textTransform: "capitalize" }}>
              <input type="checkbox" checked={bufferSelected.includes(c.id)} onChange={() => toggleBuffer(c.id)} />
              {c.service} - {c.name}
            </label>
          ))
        )}
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Buffer channels are added to your Buffer queue and go out at your next posting slot. X uses the short version of the text. <button style={btnSmall} onClick={() => loadBufferChannels(true)}>↻ Refresh channels</button></div>
      </div>

      {!batchMode ? (
        <button style={{ ...btn, opacity: !topic || loading ? 0.6 : 1 }} onClick={generate} disabled={!topic || !!loading}>
          {loading === "gen" ? "Writing..." : "Generate paragraph + image"}
        </button>
      ) : (
        <button style={{ ...btn, opacity: !batchTopics.trim() || batchGenerating ? 0.6 : 1 }} onClick={generateBatch} disabled={!batchTopics.trim() || batchGenerating}>
          {batchGenerating ? "Writing all..." : `Generate batch (${batchTopics.split("\n").filter((t) => t.trim()).length} posts)`}
        </button>
      )}

      {error && <p style={{ color: "#f87171", marginTop: 12 }}>⚠ {error}</p>}

      {/* ---- single post review ---- */}
      {!batchMode && texts && (
        <div style={{ marginTop: 32 }}>
          <img src={imgUrl} alt="preview" style={{ width: "100%", borderRadius: 10, border: "1px solid #334155" }} />
          <button style={{ ...btnGhost, marginTop: 14 }} onClick={generate} disabled={!!loading}>
            {loading === "gen" ? "Writing..." : "🔁 Regenerate wording"}
          </button>

          {PLATFORMS.map((p) => (
            <div key={p} style={{ marginTop: 18, padding: 14, border: "1px solid #334155", borderRadius: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, textTransform: "capitalize" }}>
                <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} /> {p}
                <span style={{ marginLeft: "auto", fontWeight: 400, fontSize: 12, color: texts[p].length > LIMITS[p] ? "#f87171" : "#64748b" }}>
                  {texts[p].length}/{LIMITS[p]}
                </span>
              </label>
              <textarea style={{ ...box, marginBottom: 6 }} rows={3} value={texts[p]}
                onChange={(e) => setTexts({ ...texts, [p]: e.target.value })} />
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btnSmall} onClick={() => navigator.clipboard.writeText(texts[p])}>📋 Copy text</button>
                {texts[p].length > LIMITS[p] && (
                  <button style={btnSmall} onClick={() => shorten(p)} disabled={shortening === p}>
                    {shortening === p ? "Shortening..." : "✂️ Shorten to fit"}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button style={{ ...btn, marginTop: 18, opacity: !(selected.length + bufferSelected.length) || loading ? 0.6 : 1 }}
            onClick={post} disabled={!(selected.length + bufferSelected.length) || !!loading}>
            {loading === "post" ? "Posting..." : `✅ Approve & post to ${selected.length + bufferSelected.length} platform(s)`}
          </button>

          {results && (
            <div style={{ marginTop: 24 }}>
              <h3>Result</h3>
              {Object.entries(results).map(([p, r]) => (
                <div key={p}>{r.startsWith("Failed") ? "❌" : "✅"} <b>{p}</b>: {r}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- batch review ---- */}
      {batchMode && batch.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <button style={{ ...btn, marginBottom: 20 }} onClick={postAllBatch}>
            ✅ Approve & post all ({batch.filter((b) => b.texts).length} ready)
          </button>

          {batch.map((item, i) => (
            <div key={i} style={{ marginBottom: 26, padding: 16, border: "1px solid #334155", borderRadius: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>{i + 1}. {item.topic}</div>
              {item.loading && <p>Working...</p>}
              {item.texts && (
                <>
                  <img src={imageUrlFor(item.topic, imgSubtitle, hashtags, layout, mascotStyle, link)} alt=""
                    style={{ width: "100%", borderRadius: 8, border: "1px solid #334155", marginBottom: 10 }} />
                  {PLATFORMS.map((p) => (
                    <div key={p} style={{ marginTop: 10, padding: 10, border: "1px solid #1e293b", borderRadius: 8 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>
                        <input type="checkbox" checked={item.selected.includes(p)}
                          onChange={() => updateBatchItem(i, { selected: item.selected.includes(p) ? item.selected.filter((x) => x !== p) : [...item.selected, p] })} /> {p}
                        <span style={{ marginLeft: "auto", fontWeight: 400, fontSize: 11, color: item.texts![p].length > LIMITS[p] ? "#f87171" : "#64748b" }}>
                          {item.texts![p].length}/{LIMITS[p]}
                        </span>
                      </label>
                      <textarea style={{ ...box, marginTop: 6, marginBottom: 0, fontSize: 13 }} rows={2} value={item.texts![p]}
                        onChange={(e) => updateBatchItem(i, { texts: { ...item.texts!, [p]: e.target.value } })} />
                    </div>
                  ))}
                  <button style={{ ...btnGhost, marginTop: 12 }} onClick={() => postBatchItem(i)} disabled={item.loading}>
                    {item.loading ? "Posting..." : "Post this one"}
                  </button>
                </>
              )}
              {item.results && (
                <div style={{ marginTop: 10 }}>
                  {"error" in item.results
                    ? <div style={{ color: "#f87171" }}>❌ {item.results.error}</div>
                    : Object.entries(item.results).map(([p, r]) => (
                      <div key={p} style={{ fontSize: 13 }}>{r.startsWith("Failed") ? "❌" : "✅"} <b>{p}</b>: {r}</div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
