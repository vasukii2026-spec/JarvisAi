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

// Uses sendAnimation (not sendPhoto) so a GIF actually plays instead of showing one static frame.
export async function postTelegram(caption: string, animationUrl: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set");
  const r = await fetch(`https://api.telegram.org/bot${token}/sendAnimation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, animation: animationUrl, caption }),
  });
  const d = await r.json();
  if (!d.ok) throw new Error(d.description || "Telegram request failed");
  return "Posted";
}

// GIFs are converted by Mastodon into a silent looping video ("gifv") server-side, which
// processes asynchronously (returns 202 with no url yet) - so we poll briefly until it's ready.
export async function postMastodon(status: string, gifUrl: string) {
  const base = process.env.MASTODON_BASE_URL; // e.g. https://mastodon.social
  const token = process.env.MASTODON_ACCESS_TOKEN;
  if (!base || !token) throw new Error("MASTODON_BASE_URL / MASTODON_ACCESS_TOKEN not set");
  const root = base.replace(/\/$/, "");

  const imgRes = await fetch(gifUrl);
  if (!imgRes.ok) throw new Error("Could not fetch the generated image");
  const bytes = await imgRes.arrayBuffer();
  const blob = new Blob([bytes], { type: "image/gif" });
  const form = new FormData();
  form.append("file", blob, "vasukii-post.gif");

  const mediaRes = await fetch(`${root}/api/v2/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  let media = await mediaRes.json();
  if (!media.id) throw new Error("Mastodon media upload failed: " + JSON.stringify(media).slice(0, 200));

  // 202 = still processing (gifv/video). Poll GET /api/v1/media/:id until it has a url, or give up after ~15s.
  if (mediaRes.status === 202) {
    for (let i = 0; i < 8; i++) {
      await new Promise((res) => setTimeout(res, 2000));
      const check = await fetch(`${root}/api/v1/media/${media.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (check.status === 200) { media = await check.json(); break; }
    }
  }

  const r = await fetch(`${root}/api/v1/statuses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status, media_ids: [media.id] }),
  });
  if (!r.ok) throw new Error(`Mastodon status post failed ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return "Posted";
}

// Bluesky does not reliably support animated GIFs today (even their own official app doesn't),
// so this always uses the static image, not the animated one.
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
