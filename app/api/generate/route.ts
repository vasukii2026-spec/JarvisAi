import { generateTexts } from "@/lib/generateTexts";

export async function POST(req: Request) {
  const { topic, details, link, hashtags, language } = await req.json();
  try {
    const texts = await generateTexts({ topic, details, link, hashtags, language });
    return Response.json(texts);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
