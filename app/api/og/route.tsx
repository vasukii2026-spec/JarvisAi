import { ImageResponse } from "next/og";

export const runtime = "edge";

const BG = "linear-gradient(135deg,#0b1220,#132445)";
const FONT = "sans-serif";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "Vasukii").slice(0, 90);
  const subtitle = (searchParams.get("subtitle") || "").slice(0, 140);
  const tag = (searchParams.get("tag") || "").slice(0, 60);
  const layout = searchParams.get("layout") || "classic";
  const origin = new URL(req.url).origin;
  const logoUrl = `${origin}/logo.png`; // served from /public/logo.png

  let content;

  if (layout === "banner") {
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
          <div style={{ display: "flex", fontSize: 28, color: "#cbd5e1", marginTop: 22, maxWidth: 900 }}>
            {subtitle}
          </div>
        )}
        {tag && <div style={{ display: "flex", fontSize: 22, color: "#34d399", marginTop: 30 }}>{tag}</div>}
      </div>
    );
  } else if (layout === "quote") {
    // Large centered statement, small logo badge in the corner - good for a punchy one-liner
    content = (
      <div style={{
        height: "100%", width: "100%", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "90px", background: BG, color: "white", fontFamily: FONT,
        position: "relative",
      }}>
        <div style={{ display: "flex", fontSize: 30, color: "#38bdf8", marginBottom: 20 }}>&ldquo;</div>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 700, lineHeight: 1.2, maxWidth: 1000 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ display: "flex", fontSize: 28, color: "#cbd5e1", marginTop: 26, maxWidth: 950 }}>
            {subtitle}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", marginTop: 40 }}>
          <img src={logoUrl} width={56} height={56} style={{ borderRadius: 10, marginRight: 16 }} />
          <div style={{ display: "flex", fontSize: 22, color: "#34d399" }}>{tag || "VASUKII"}</div>
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
            <div style={{ display: "flex", fontSize: 26, color: "#cbd5e1", marginTop: 24 }}>{subtitle}</div>
          )}
          {tag && <div style={{ display: "flex", fontSize: 22, color: "#34d399", marginTop: 34 }}>{tag}</div>}
        </div>
        <img src={logoUrl} width={300} height={300} style={{ borderRadius: 24, flexShrink: 0 }} />
      </div>
    );
  }

  return new ImageResponse(content, { width: 1200, height: 630 });
}
