import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "Vasukii").slice(0, 90);
  const subtitle = (searchParams.get("subtitle") || "").slice(0, 140);
  const tag = (searchParams.get("tag") || "").slice(0, 60);
  // "style" picks the character look: bottts (robots), adventurer, big-smile, fun-emoji, thumbs, etc.
  // see https://dicebear.com/styles for the full list. Same title always gives the same character.
  const style = searchParams.get("style") || "bottts";
  const seed = encodeURIComponent(title || "vasukii");
  const avatarUrl = `https://api.dicebear.com/10.x/${style}/png?seed=${seed}&size=340&backgroundColor=1e293b,132445&backgroundType=gradientLinear`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%", width: "100%", display: "flex", alignItems: "center",
          padding: "70px", background: "linear-gradient(135deg,#0b1220,#132445)",
          color: "white", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#38bdf8", letterSpacing: 6, marginBottom: 20 }}>
            VASUKII
          </div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ display: "flex", fontSize: 26, color: "#cbd5e1", marginTop: 24 }}>
              {subtitle}
            </div>
          )}
          {tag && <div style={{ display: "flex", fontSize: 22, color: "#34d399", marginTop: 34 }}>{tag}</div>}
        </div>
        <img
          src={avatarUrl}
          width={300}
          height={300}
          style={{ borderRadius: 24, border: "4px solid #38bdf8", flexShrink: 0 }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
