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
  if (d.errors?.length) throw new Error(`Buffer: ${d.errors[0].message || JSON.stringify(d.errors[0]).slice(0, 200)}`);
  return d.data;
}

export async function listBufferChannels(): Promise<BufferChannel[]> {
  const orgs = await gql(`query { account { organizations { id name } } }`);
  const out: BufferChannel[] = [];
  for (const org of orgs.account?.organizations || []) {
    const d = await gql(
      `query($input: ChannelsInput!) { channels(input: $input) { id name displayName service } }`,
      { input: { organizationId: org.id } }
    );
    for (const c of d.channels || []) {
      out.push({ id: c.id, name: c.displayName || c.name || c.service, service: c.service });
    }
  }
  return out;
}

// Adds the post (text + image) to the channel's Buffer queue. Buffer publishes it at the
// channel's next posting slot, so set your posting schedule in Buffer.
export async function postBuffer(channelId: string, service: string, text: string, imageUrl: string) {
  const input: Record<string, unknown> = {
    text,
    channelId,
    schedulingType: "automatic",
    mode: "addToQueue",
    assets: [{ image: { url: imageUrl } }],
  };
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
  if (res?.post?.id) return "Queued in Buffer";
  throw new Error(res?.message || "Buffer did not create the post");
}
