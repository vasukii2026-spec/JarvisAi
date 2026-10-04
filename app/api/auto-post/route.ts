import { generateTexts } from "@/lib/generateTexts";
import { pickTopic } from "@/lib/topics";
import { postToAll, buildImageUrl } from "@/lib/postAll";

const LAYOUTS = ["classic", "banner", "quote", "mascot"];

// Called every hour by an external pinger (see README) or Vercel's own daily cron.
// Protected by a secret so nobody else can trigger posts to your real accounts.
// Add &dry=1 to generate and preview without actually posting anywhere - useful for testing.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.AUTO_POST_SECRET || secret !== process.env.AUTO_POST_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const website = process.env.VASUKII_WEBSITE || "";
  const hashtags = process.env.AUTO_POST_HASHTAGS || "#Vasukii";
  const topic = pickTopic();
  const layout = LAYOUTS[Math.floor(Date.now() / (1000 * 60 * 30)) % LAYOUTS.length];
  const dry = searchParams.get("dry") === "1";

  try {
    const texts = await generateTexts({ topic, link: website, hashtags, language: "English" });
    const image = { title: texts.headline || "Vasukii", subtitle: "", tag: hashtags, layout, link: website };

    if (dry) {
      const origin = new URL(req.url).origin;
      return Response.json({ dryRun: true, topic, texts, imageUrl: buildImageUrl(origin, image) });
    }

    const origin = new URL(req.url).origin;
    // Optional: BUFFER_AUTO_CHANNELS="twitter:<id>,instagram:<id>" also sends these through Buffer.
    // To protect Buffer's API limits (and the free queue of 10 posts per channel), Buffer is only used on
    // every Nth 30-minute slot. Default 16 = 3 times a day. Set BUFFER_AUTO_EVERY_N to change it.
    const everyN = Math.max(1, parseInt(process.env.BUFFER_AUTO_EVERY_N || "16", 10) || 16);
    const slot = Math.floor(Date.now() / (1000 * 60 * 30));
    const bufferThisRun = slot % everyN === 0;
    const bufferTargets = bufferThisRun
      ? (process.env.BUFFER_AUTO_CHANNELS || "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => `buffer:${x}`)
      : [];
    const results = await postToAll(origin, ["discord", "telegram", "mastodon", "bluesky", ...bufferTargets], texts, image);
    return Response.json({ topic, bufferThisRun, results });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
