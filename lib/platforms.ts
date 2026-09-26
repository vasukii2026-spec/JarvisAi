export async function postDiscord(content: string, imageUrl: string) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) throw new Error("DISCORD_WEBHOOK_URL is not set");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, embeds: [{ image: { url: imageUrl } }] }),
  });
  if (!r.ok) throw new Error(`Discord responded ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return "Posted";
}

export async function postTelegram(caption: string, imageUrl: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set");
  const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: imageUrl, caption }),
  });
  const d = await r.json();
  if (!d.ok) throw new Error(d.description || "Telegram request failed");
  return "Posted";
}

export async function postMastodon(status: string, imageUrl: string) {
  const base = process.env.MASTODON_BASE_URL; // e.g. https://mastodon.social
  const token = process.env.MASTODON_ACCESS_TOKEN;
  if (!base || !token) throw new Error("MASTODON_BASE_URL / MASTODON_ACCESS_TOKEN not set");

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("Could not fetch the generated image");
  const bytes = await imgRes.arrayBuffer();
  const blob = new Blob([bytes], { type: "image/png" });
  const form = new FormData();
  form.append("file", blob, "vasukii-post.png");

  const mediaRes = await fetch(`${base.replace(/\/$/, "")}/api/v2/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const media = await mediaRes.json();
  if (!media.id) throw new Error("Mastodon media upload failed: " + JSON.stringify(media).slice(0, 200));

  const r = await fetch(`${base.replace(/\/$/, "")}/api/v1/statuses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status, media_ids: [media.id] }),
  });
  if (!r.ok) throw new Error(`Mastodon status post failed ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return "Posted";
}

export async function postBluesky(text: string, imageUrl: string) {
  const identifier = process.env.BLUESKY_IDENTIFIER; // handle or email
  const password = process.env.BLUESKY_APP_PASSWORD; // an APP PASSWORD, not your main password
  if (!identifier || !password) throw new Error("BLUESKY_IDENTIFIER / BLUESKY_APP_PASSWORD not set");

  const sessionRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const session = await sessionRes.json();
  if (!session.accessJwt) throw new Error("Bluesky login failed: " + JSON.stringify(session).slice(0, 200));

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("Could not fetch the generated image");
  const bytes = new Uint8Array(await imgRes.arrayBuffer());

  const blobRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.uploadBlob", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessJwt}`, "Content-Type": "image/png" },
    body: bytes,
  });
  const blobData = await blobRes.json();
  if (!blobData.blob) throw new Error("Bluesky image upload failed: " + JSON.stringify(blobData).slice(0, 200));

  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    embed: { $type: "app.bsky.embed.images", images: [{ image: blobData.blob, alt: "Vasukii" }] },
  };
  const post = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessJwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ repo: session.did, collection: "app.bsky.feed.post", record }),
  });
  if (!post.ok) throw new Error(`Bluesky post failed ${post.status}: ${(await post.text()).slice(0, 200)}`);
  return "Posted";
}
