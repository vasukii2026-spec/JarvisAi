import { ImageResponse } from "next/og";

export const runtime = "edge";

// Vasukii brand colors: black background, orange accents, gold logo.
const BG = "linear-gradient(135deg,#050302,#1a0d00)";
const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fdba74";
const GRAY = "#d4d4d4";
const FONT = "sans-serif";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "Vasukii").slice(0, 90);
  const subtitle = (searchParams.get("subtitle") || "").slice(0, 140);
  const tag = (searchParams.get("tag") || "").slice(0, 60);
  const layout = searchParams.get("layout") || "classic";
  const mascotStyle = searchParams.get("style") || "bottts";
  const origin = new URL(req.url).origin;
  const logoUrl = `${origin}/logo.png`; // served from /public/logo.png
  // Auto-generated character avatar (DiceBear - free, keyless, not AI). Same title = same character.
  const avatarUrl = `https://api.dicebear.com/10.x/${mascotStyle}/png?seed=${encodeURIComponent(title)}&size=340&backgroundColor=1a0d00,000000&backgroundType=gradientLinear`;

  let content;

  if (layout === "mascot") {
    // Auto-generated character avatar instead of the fixed logo - variety on demand
    content = (
      <div style={{
        height: "100%", width: "100%", display: "flex", alignItems: "center",
        padding: "70px", background: BG, color: "white", fontFamily: FONT,
      }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
          <div style={{ display: "flex", fontSize: 26, color: ORANGE, letterSpacing: 6, marginBottom: 20 }}>VASUKII</div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
          {subtitle && <div style={{ display: "flex", fontSize: 26, color: GRAY, marginTop: 24 }}>{subtitle}</div>}
          {tag && <div style={{ display: "flex", fontSize: 22, color: ORANGE_LIGHT, marginTop: 34 }}>{tag}</div>}
        </div>
        <img src={avatarUrl} width={300} height={300} style={{ borderRadius: 24, border: `4px solid ${ORANGE}`, flexShrink: 0 }} />
      </div>
    );
  } else if (layout === "banner") {
    // Big centered logo up top, headline below - good for major announcements
    content = (
      <div style={{
        height: "100%", width: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "60px",
        background: BG, color: "white", fontFamily: FONT, textAlign: "center",
      }}>
        <img src={logoUrl} width={220} height={220} style={{ borderRadius: 20, marginBottom: 36 }} />
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.15, maxWidth: 1000 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ display: "flex", fontSize: 28, color: GRAY, marginTop: 22, maxWidth: 900 }}>
            {subtitle}
          </div>
        )}
        {tag && <div style={{ display: "flex", fontSize: 22, color: ORANGE, marginTop: 30 }}>{tag}</div>}
      </div>
    );
  } else if (layout === "quote") {
    // Large centered statement, small logo badge in the corner - good for a punchy one-liner
    content = (
      <div style={{
        height: "100%", width: "100%", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "90px", background: BG, color: "white", fontFamily: FONT,
      }}>
        <div style={{ display: "flex", fontSize: 30, color: ORANGE, marginBottom: 20 }}>&ldquo;</div>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 700, lineHeight: 1.2, maxWidth: 1000 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ display: "flex", fontSize: 28, color: GRAY, marginTop: 26, maxWidth: 950 }}>
            {subtitle}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", marginTop: 40 }}>
          <img src={logoUrl} width={56} height={56} style={{ borderRadius: 10, marginRight: 16 }} />
          <div style={{ display: "flex", fontSize: 22, color: ORANGE_LIGHT }}>{tag || "VASUKII"}</div>
        </div>
      </div>
    );
  } else {
    // "classic": text left, logo right - the original default layout
    content = (
      <div style={{
        height: "100%", width: "100%", display: "flex", alignItems: "center",
        padding: "70px", background: BG, color: "white", fontFamily: FONT,
      }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
          {subtitle && (
            <div style={{ display: "flex", fontSize: 26, color: GRAY, marginTop: 24 }}>{subtitle}</div>
          )}
          {tag && <div style={{ display: "flex", fontSize: 22, color: ORANGE_LIGHT, marginTop: 34 }}>{tag}</div>}
        </div>
        <img src={logoUrl} width={300} height={300} style={{ borderRadius: 24, flexShrink: 0 }} />
      </div>
    );
  }

  return new ImageResponse(content, { width: 1200, height: 630 });
}
