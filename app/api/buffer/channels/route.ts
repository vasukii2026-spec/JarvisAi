import { listBufferChannels } from "@/lib/buffer";

// Lists the channels (X, Instagram, ...) connected to your Buffer account so the page can show checkboxes.
// Protected by the same APP_PASSWORD middleware as the rest of the app.
export async function GET() {
  if (!process.env.BUFFER_API_KEY) return Response.json({ channels: [] });
  try {
    return Response.json({ channels: await listBufferChannels() });
  } catch (e: any) {
    return Response.json({ channels: [], error: e.message }, { status: 500 });
  }
}
