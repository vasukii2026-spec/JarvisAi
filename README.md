# Vasukii Marketing Poster

A small web app: type an announcement, it writes a paragraph for each platform
(with Groq), draws a matching image (no AI, a template), you review and edit,
then you approve which platforms to post to.

No AI is used for the image — it's drawn from a design template so it's instant and free.
Only the text uses Groq.

## Run it on your computer first (optional but recommended)

1. Install Node.js (18 or newer) from nodejs.org.
2. Open a terminal in this folder and run: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your keys (see "Getting each key" below).
4. Run `npm run dev`, then open http://localhost:3000

## Deploy to Vercel

1. Create a free GitHub account if you don't have one, and a new empty repository.
2. Push this folder to that repository (or use GitHub Desktop / VS Code's Git panel — no command line needed).
3. Go to vercel.com, sign in with GitHub, click "Add New… > Project", and pick your repository.
4. Before the first deploy, open "Environment Variables" and add every key from `.env.example`
   (same names, your real values). Never put real keys in the code or in GitHub.
5. Click Deploy. Vercel gives you a URL like `https://vasukii-marketing.vercel.app` — open it and use the app from there, on any device.
6. Whenever you push a change to GitHub, Vercel updates the live site automatically.

## Getting each key

- **Groq**: console.groq.com > API Keys.
- **Discord**: in your server, Channel Settings > Integrations > Webhooks > New Webhook > Copy Webhook URL. This is `DISCORD_WEBHOOK_URL`.
- **Telegram**: message @BotFather to create a bot and get `TELEGRAM_BOT_TOKEN`. For `TELEGRAM_CHAT_ID`, add the bot to your channel/group as admin, send one message there, then visit `https://api.telegram.org/bot<token>/getUpdates` in a browser to find the chat id.
- **Mastodon**: on your instance, Preferences > Development > New Application, with the `write:statuses` and `write:media` scopes. Use your instance's address for `MASTODON_BASE_URL` (e.g. `https://mastodon.social`).
- **Bluesky**: Settings > App Passwords > Add App Password. Use that (not your real password) as `BLUESKY_APP_PASSWORD`, and your handle (e.g. `you.bsky.social`) as `BLUESKY_IDENTIFIER`.

## How posting safety works

- Nothing posts automatically. You always see the paragraph and the image first, tick which platforms to send to, and click one confirm button.
- Each platform is posted to independently, so if one fails (e.g. a wrong token) the others still go through, and you'll see a clear ✅/❌ per platform.

## Files

- `app/page.tsx` – the page you use (form, preview, approve button)
- `app/api/generate/route.ts` – asks Groq for the four paragraphs
- `app/api/og/route.tsx` – draws the image (template, no AI)
- `app/api/post/route.ts` – posts to whichever platforms you approved
- `lib/platforms.ts` – the actual API calls to Discord/Telegram/Mastodon/Bluesky
