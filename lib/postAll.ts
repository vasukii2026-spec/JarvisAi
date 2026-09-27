import { postDiscord, postTelegram, postMastodon, postBluesky } from "@/lib/platforms";

export type PostImage = { title?: string; subtitle?: string; tag?: string; layout?: string };
export type PostTexts = { mastodon?: string; bluesky?: string; discord?: string; telegram?: string };

export function buildImageUrl(origin: string, image: PostImage) {
  return `${origin}/api/og?title=${encodeURIComponent(image.title || "Vasukii")}` +
    `&subtitle=${encodeURIComponent(image.subtitle || "")}&tag=${encodeURIComponent(image.tag || "")}` +
    `&layout=${encodeURIComponent(image.layout || "classic")}`;
}

export async function postToAll(origin: string, platforms: string[], texts: PostTexts, image: PostImage) {
  const imgUrl = buildImageUrl(origin, image);
  const results: Record<string, string> = {};
  await Promise.all(
    platforms.map(async (p) => {
      try {
        if (p === "discord") results.discord = await postDiscord(texts.discord || "", imgUrl);
        else if (p === "telegram") results.telegram = await postTelegram(texts.telegram || "", imgUrl);
        else if (p === "mastodon") results.mastodon = await postMastodon(texts.mastodon || "", imgUrl);
        else if (p === "bluesky") results.bluesky = await postBluesky(texts.bluesky || "", imgUrl);
        else results[p] = "Failed: unknown platform";
      } catch (e: any) {
        results[p] = `Failed: ${e.message}`;
      }
    })
  );
  return results;
}
