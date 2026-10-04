import { listBufferChannels } from "@/lib/buffer";

// Lists the channels (X, Instagram, ...) connected to your Buffer account so the page can show checkboxes.
// Cached for 6 hours to save API requests; add ?refresh=1 to force a fresh lookup.
// Protected by the same APP_PASSWORD middleware as the rest of the app.
export async function GET(req: Request) {
  if (!process.env.BUFFER_API_KEY) return Response.json({ channels: [] });
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    return Response.json({ channels: await listBufferChannels(refresh) });
  } catch (e: any) {
    return Response.json({ channels: [], error: e.message }, { status: 500 });
  }
}
