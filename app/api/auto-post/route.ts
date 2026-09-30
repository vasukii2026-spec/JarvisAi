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
    const results = await postToAll(origin, ["discord", "telegram", "mastodon", "bluesky"], texts, image);
    return Response.json({ topic, results });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
