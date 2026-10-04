import { postToAll } from "@/lib/postAll";

export async function POST(req: Request) {
  const body = await req.json();
  const platforms: string[] = body.platforms || [];
  const texts = body.texts || {};
  const image = body.image || {};
  const bufferTexts: Record<string, string> = body.bufferTexts || {};
  const bufferDueAt: string | undefined = body.bufferDueAt || undefined;

  if (!platforms.length) return Response.json({ error: "No platform selected" }, { status: 400 });

  // Scheduled time (Buffer channels only) must be a valid time in the future.
  if (bufferDueAt) {
    const t = Date.parse(bufferDueAt);
    if (isNaN(t) || t < Date.now() + 60_000) {
      return Response.json({ error: "Schedule time must be at least a minute in the future" }, { status: 400 });
    }
  }

  const origin = new URL(req.url).origin;
  const results = await postToAll(origin, platforms, texts, image, { bufferTexts, dueAt: bufferDueAt });
  return Response.json(results);
}
