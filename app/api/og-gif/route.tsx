import { ImageResponse } from "next/og";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { PNG } from "pngjs";

// Node.js runtime (not edge) - pngjs needs Node's zlib, which edge doesn't have.
// Rendering ~14 frames takes a few seconds, so this gives it comfortable headroom.
export const maxDuration = 30;

const BG = "linear-gradient(135deg,#050302,#1a0d00)";
const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fdba74";
const GRAY = "#d4d4d4";
const FONT = "sans-serif";
const FRAMES = 14;
const DELAY_MS = 90; // ~1.26s full loop

function frameContent(params: {
  t: number; title: string; subtitle: string; tag: string; layout: string;
  logoUrl: string; avatarUrl: string; qrUrl: string;
}) {
  const { t, title, subtitle, tag, layout, logoUrl, avatarUrl, qrUrl } = params;
  const angle = t * 2 * Math.PI;
  const scale = 1 + 0.035 * Math.sin(angle); // gentle breathing pulse, loops seamlessly (t=0 === t=1)
  const glowX = 50 + 22 * Math.cos(angle);
  const glowY = 50 + 22 * Math.sin(angle);
  const imgProps = (size: number, extra: React.CSSProperties = {}) => ({
    width: size, height: size,
    style: { borderRadius: 24, flexShrink: 0, transform: `scale(${scale})`, ...extra } as React.CSSProperties,
  });

  let inner;
  if (layout === "mascot") {
    inner = (
      <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", padding: "70px", color: "white", fontFamily: FONT }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
          <div style={{ display: "flex", fontSize: 26, color: ORANGE, letterSpacing: 6, marginBottom: 20 }}>VASUKII</div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
          {subtitle && <div style={{ display: "flex", fontSize: 26, color: GRAY, marginTop: 24 }}>{subtitle}</div>}
          {tag && <div style={{ display: "flex", fontSize: 22, color: ORANGE_LIGHT, marginTop: 34 }}>{tag}</div>}
        </div>
        <img src={avatarUrl} {...imgProps(300, { border: `4px solid ${ORANGE}` })} />
      </div>
    );
  } else if (layout === "banner") {
    inner = (
      <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px", color: "white", fontFamily: FONT, textAlign: "center" }}>
        <img src={logoUrl} {...imgProps(220, { marginBottom: 36 })} />
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.15, maxWidth: 1000 }}>{title}</div>
        {subtitle && <div style={{ display: "flex", fontSize: 28, color: GRAY, marginTop: 22, maxWidth: 900 }}>{subtitle}</div>}
        {tag && <div style={{ display: "flex", fontSize: 22, color: ORANGE, marginTop: 30 }}>{tag}</div>}
      </div>
    );
  } else if (layout === "quote") {
    inner = (
      <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "90px", color: "white", fontFamily: FONT }}>
        <div style={{ display: "flex", fontSize: 30, color: ORANGE, marginBottom: 20 }}>&ldquo;</div>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 700, lineHeight: 1.2, maxWidth: 1000 }}>{title}</div>
        {subtitle && <div style={{ display: "flex", fontSize: 28, color: GRAY, marginTop: 26, maxWidth: 950 }}>{subtitle}</div>}
        <div style={{ display: "flex", alignItems: "center", marginTop: 40 }}>
          <img src={logoUrl} {...imgProps(56, { marginRight: 16 })} />
          <div style={{ display: "flex", fontSize: 22, color: ORANGE_LIGHT }}>{tag || "VASUKII"}</div>
        </div>
      </div>
    );
  } else {
    inner = (
      <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", padding: "70px", color: "white", fontFamily: FONT }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
          {subtitle && <div style={{ display: "flex", fontSize: 26, color: GRAY, marginTop: 24 }}>{subtitle}</div>}
          {tag && <div style={{ display: "flex", fontSize: 22, color: ORANGE_LIGHT, marginTop: 34 }}>{tag}</div>}
        </div>
        <img src={logoUrl} {...imgProps(300)} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: BG }}>
      {/* moving soft glow - this is what actually animates frame to frame, behind the content */}
      <div style={{
        display: "flex", position: "absolute", width: 500, height: 500,
        left: `${glowX}%`, top: `${glowY}%`, marginLeft: -250, marginTop: -250,
        background: "radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(249,115,22,0) 70%)",
      }} />
      {inner}
      {qrUrl && (
        <div style={{ display: "flex", position: "absolute", left: 36, bottom: 36, background: "white", padding: 10, borderRadius: 12 }}>
          <img src={qrUrl} width={100} height={100} />
        </div>
      )}
    </div>
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "Vasukii").slice(0, 90);
  const subtitle = (searchParams.get("subtitle") || "").slice(0, 140);
  const tag = (searchParams.get("tag") || "").slice(0, 60);
  const layout = searchParams.get("layout") || "classic";
  const mascotStyle = searchParams.get("style") || "bottts";
  const link = (searchParams.get("link") || "").slice(0, 300);
  const origin = new URL(req.url).origin;
  const logoUrl = `${origin}/logo.png`;
  const avatarUrl = `https://api.dicebear.com/10.x/${mascotStyle}/png?seed=${encodeURIComponent(title)}&size=340&backgroundColor=1a0d00,000000&backgroundType=gradientLinear`;
  const qrUrl = link ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(link)}` : "";

  try {
    const gif = GIFEncoder();

    for (let i = 0; i < FRAMES; i++) {
      const t = i / FRAMES;
      const frame = frameContent({ t, title, subtitle, tag, layout, logoUrl, avatarUrl, qrUrl });
      const png = new ImageResponse(frame, { width: 1200, height: 630 });
      const pngBuffer = Buffer.from(await png.arrayBuffer());
      const decoded = PNG.sync.read(pngBuffer);
      const palette = quantize(decoded.data, 256);
      const index = applyPalette(decoded.data, palette);
      gif.writeFrame(index, decoded.width, decoded.height, { palette, delay: DELAY_MS });
    }

    gif.finish();
    const bytes = gif.bytes();
    return new Response(Buffer.from(bytes), {
      headers: { "Content-Type": "image/gif", "Cache-Control": "public, max-age=60" },
    });
  } catch (e: any) {
    return Response.json({ error: `Could not build the animated image: ${e.message}` }, { status: 500 });
  }
}
