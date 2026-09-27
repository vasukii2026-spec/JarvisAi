import { postToAll } from "@/lib/postAll";

export async function POST(req: Request) {
  const body = await req.json();
  const platforms: string[] = body.platforms || [];
  const texts = body.texts || {};
  const image = body.image || {};

  if (!platforms.length) return Response.json({ error: "No platform selected" }, { status: 400 });

  const origin = new URL(req.url).origin;
  const results = await postToAll(origin, platforms, texts, image);
  return Response.json(results);
}
