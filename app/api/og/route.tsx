import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "Vasukii").slice(0, 90);
  const subtitle = (searchParams.get("subtitle") || "").slice(0, 140);
  const tag = (searchParams.get("tag") || "").slice(0, 60);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%", width: "100%", display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "80px", background: "linear-gradient(135deg,#0b1220,#132445)",
          color: "white", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#38bdf8", letterSpacing: 6, marginBottom: 24 }}>
          VASUKII
        </div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 700, lineHeight: 1.15, maxWidth: 950 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ display: "flex", fontSize: 30, color: "#cbd5e1", marginTop: 28, maxWidth: 900 }}>
            {subtitle}
          </div>
        )}
        {tag && <div style={{ display: "flex", fontSize: 24, color: "#34d399", marginTop: 40 }}>{tag}</div>}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
