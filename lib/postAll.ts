import { postDiscord, postTelegram, postMastodon, postBluesky } from "@/lib/platforms";

export type PostImage = { title?: string; subtitle?: string; tag?: string; layout?: string; style?: string; link?: string };
export type PostTexts = { mastodon?: string; bluesky?: string; discord?: string; telegram?: string };

function paramsFor(image: PostImage) {
  return `title=${encodeURIComponent(image.title || "Vasukii")}` +
    `&subtitle=${encodeURIComponent(image.subtitle || "")}&tag=${encodeURIComponent(image.tag || "")}` +
    `&layout=${encodeURIComponent(image.layout || "classic")}&style=${encodeURIComponent(image.style || "bottts")}` +
    `&link=${encodeURIComponent(image.link || "")}`;
}

// Static image - used for Bluesky (no reliable animated GIF support today) and as the preview fallback.
export function buildImageUrl(origin: string, image: PostImage) {
  return `${origin}/api/og?${paramsFor(image)}`;
}

// Animated version - used for Discord, Telegram and Mastodon, which all actually play GIFs.
export function buildGifUrl(origin: string, image: PostImage) {
  return `${origin}/api/og-gif?${paramsFor(image)}`;
}

export async function postToAll(origin: string, platforms: string[], texts: PostTexts, image: PostImage) {
  const staticUrl = buildImageUrl(origin, image);
  const gifUrl = buildGifUrl(origin, image);
  const results: Record<string, string> = {};
  await Promise.all(
    platforms.map(async (p) => {
      try {
        if (p === "discord") results.discord = await postDiscord(texts.discord || "", gifUrl);
        else if (p === "telegram") results.telegram = await postTelegram(texts.telegram || "", gifUrl);
        else if (p === "mastodon") results.mastodon = await postMastodon(texts.mastodon || "", gifUrl);
        else if (p === "bluesky") results.bluesky = await postBluesky(texts.bluesky || "", staticUrl);
        else results[p] = "Failed: unknown platform";
      } catch (e: any) {
        results[p] = `Failed: ${e.message}`;
      }
    })
  );
  return results;
}
