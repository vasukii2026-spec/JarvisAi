import { postDiscord, postTelegram, postMastodon, postBluesky } from "@/lib/platforms";

export async function POST(req: Request) {
  const body = await req.json();
  const platforms: string[] = body.platforms || [];
  const texts = body.texts || {};
  const image = body.image || {};

  if (!platforms.length) return Response.json({ error: "No platform selected" }, { status: 400 });

  const origin = new URL(req.url).origin;
  const imgUrl = `${origin}/api/og?title=${encodeURIComponent(image.title || "Vasukii")}` +
    `&subtitle=${encodeURIComponent(image.subtitle || "")}&tag=${encodeURIComponent(image.tag || "")}`;

  const results: Record<string, string> = {};
  await Promise.all(
    platforms.map(async (p) => {
      try {
        if (p === "discord") results.discord = await postDiscord(texts.discord, imgUrl);
        else if (p === "telegram") results.telegram = await postTelegram(texts.telegram, imgUrl);
        else if (p === "mastodon") results.mastodon = await postMastodon(texts.mastodon, imgUrl);
        else if (p === "bluesky") results.bluesky = await postBluesky(texts.bluesky, imgUrl);
        else results[p] = "Failed: unknown platform";
      } catch (e: any) {
        results[p] = `Failed: ${e.message}`;
      }
    })
  );
  return Response.json(results);
}
