// Buffer GraphQL API (https://developers.buffer.com). One endpoint, Bearer API key.
// Buffer's old REST API is being retired on 1 Feb 2027, so this uses the new GraphQL one.
// Lets this app publish to X, Instagram, LinkedIn, Facebook, Threads, etc. through your Buffer account.

const ENDPOINT = "https://api.buffer.com";

export type BufferChannel = { id: string; name: string; service: string };

async function gql(query: string, variables?: Record<string, unknown>) {
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error("BUFFER_API_KEY is not set");
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`Buffer responded ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  // Non-recoverable errors (bad key, rate limit...) come back in `errors`, still with HTTP 200.
  if (d.errors?.some((e: any) => e?.extensions?.code === "RATE_LIMIT_EXCEEDED"))
    throw new Error("Buffer rate limit reached (free plan: 100 per 15 min, 250 per day, 3,000 per 30 days). Wait and try again later.");
  if (d.errors?.length) throw new Error(`Buffer: ${d.errors[0].message || JSON.stringify(d.errors[0]).slice(0, 200)}`);
  return d.data;
}

// Buffer's free API key allows 100 requests / 15 min, 250 / day, 3,000 / 30 days.
// To stay far below that, the channel list is cached in memory for 6 hours (and the browser caches it too),
// and BUFFER_ORGANIZATION_ID (optional) skips the organization lookup entirely.
const CACHE_MS = 6 * 60 * 60 * 1000;
let cache: { at: number; channels: BufferChannel[] } | null = null;

export async function listBufferChannels(force = false): Promise<BufferChannel[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.channels;
  const envOrg = (process.env.BUFFER_ORGANIZATION_ID || "").trim();
  const orgList: { id: string }[] = envOrg
    ? [{ id: envOrg }]
    : (await gql(`query { account { organizations { id name } } }`)).account?.organizations || [];
  const out: BufferChannel[] = [];
  for (const org of orgList) {
    const d = await gql(
      `query($input: ChannelsInput!) { channels(input: $input) { id name displayName service } }`,
      { input: { organizationId: org.id } }
    );
    for (const c of d.channels || []) {
      out.push({ id: c.id, name: c.displayName || c.name || c.service, service: c.service });
    }
  }
  cache = { at: Date.now(), channels: out };
  return out;
}

// Default: adds the post to the channel's Buffer queue (goes out at the next posting slot).
// Set BUFFER_MODE=shareNow in your env to publish immediately instead.
// Allowed: addToQueue | shareNow | shareNext
export async function postBuffer(channelId: string, service: string, text: string, imageUrl: string, dueAt?: string) {
  const input: Record<string, unknown> = {
    text,
    channelId,
    schedulingType: "automatic",
    mode: ["addToQueue", "shareNow", "shareNext"].includes(process.env.BUFFER_MODE || "") ? process.env.BUFFER_MODE : "addToQueue",
    assets: [{ image: { url: imageUrl } }],
  };
  // Optional exact time (ISO 8601, UTC). When given, it overrides the queue / BUFFER_MODE.
  if (dueAt) { input.mode = "customScheduled"; input.dueAt = dueAt; }
  // Instagram requires its own metadata block.
  if (service === "instagram") input.metadata = { instagram: { type: "post", shouldShareToFeed: true } };

  const d = await gql(
    `mutation CreatePost($input: CreatePostInput!) {
       createPost(input: $input) {
         ... on PostActionSuccess { post { id } }
         ... on MutationError { message }
       }
     }`,
    { input }
  );
  const res = d.createPost;
  if (res?.post?.id) return input.mode === "customScheduled" ? "Scheduled in Buffer" : input.mode === "shareNow" ? "Sent to Buffer (publishing now)" : "Queued in Buffer";
  throw new Error(res?.message || "Buffer did not create the post");
}
