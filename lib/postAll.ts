import { postDiscord, postTelegram, postMastodon, postBluesky } from "@/lib/platforms";
import { postBuffer } from "@/lib/buffer";

export type PostImage = { title?: string; subtitle?: string; tag?: string; layout?: string; style?: string; link?: string };
export type PostTexts = { mastodon?: string; bluesky?: string; discord?: string; telegram?: string };

export function buildImageUrl(origin: string, image: PostImage) {
  return `${origin}/api/og?title=${encodeURIComponent(image.title || "Vasukii")}` +
    `&subtitle=${encodeURIComponent(image.subtitle || "")}&tag=${encodeURIComponent(image.tag || "")}` +
    `&layout=${encodeURIComponent(image.layout || "classic")}&style=${encodeURIComponent(image.style || "bottts")}` +
    `&link=${encodeURIComponent(image.link || "")}`;
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
        else if (p.startsWith("buffer:")) {
          // format: buffer:<service>:<channelId>
          const [, service, channelId] = p.split(":");
          // X gets the short (<=260 char) version; every other network gets the longer one.
          const text = service === "twitter" ? texts.bluesky || "" : texts.mastodon || "";
          results[`buffer-${service}-${channelId.slice(-4)}`] = await postBuffer(channelId, service, text, imgUrl);
        }
        else results[p] = "Failed: unknown platform";
      } catch (e: any) {
        const key = p.startsWith("buffer:") ? `buffer-${p.split(":")[1]}-${p.split(":")[2]?.slice(-4)}` : p;
        results[key] = `Failed: ${e.message}`;
      }
    })
  );
  return results;
}
