# Vasukii Marketing Poster

A small web app: type an announcement, it writes a paragraph for each platform
(with Groq), draws a matching branded image using your real logo (no AI needed
for the image), you review and edit, then approve which platforms to post to.

## Run it on your computer first (optional but recommended)

1. Install Node.js (18 or newer) from nodejs.org.
2. Open a terminal in this folder and run: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your keys (see "Getting each key" below).
4. Run `npm run dev`, then open http://localhost:3000

## Deploy to Vercel

1. Push this folder to a GitHub repository (GitHub Desktop or VS Code's Git panel works with no command line).
2. Go to vercel.com, sign in with GitHub, click "Add New… > Project", pick your repository.
3. Before the first deploy, open "Environment Variables" and add every key from `.env.example`
   with your real values. Never put real keys in the code or in GitHub.
4. Click Deploy. **Important:** go to Settings > Deployment Protection and make sure it's turned
   OFF (or Preview-only) for Production. If it's on, your image links won't be reachable by
   Discord/Mastodon/Bluesky/Telegram and posting will fail.
5. Whenever you push a change to GitHub, Vercel updates the live site automatically.

## Getting each key

- **Groq**: console.groq.com > API Keys. If you ever see `model_not_found`, Groq retired that
  model name — check console.groq.com/docs/models and update the model line in
  `app/api/generate/route.ts`.
- **Discord**: Channel Settings > Integrations > Webhooks > New Webhook > Copy Webhook URL.
- **Telegram**: message @BotFather to create a bot (`TELEGRAM_BOT_TOKEN`). For `TELEGRAM_CHAT_ID`:
  if your channel/group is public (has a t.me/name link), just use `@name` directly. Otherwise,
  add the bot as admin, send one message, then visit
  `https://api.telegram.org/bot<token>/getUpdates` and find `"chat":{"id":...}`.
- **Mastodon**: `MASTODON_BASE_URL` is just the server domain, e.g. `https://mastodon.social` —
  no `@username`, no trailing slash, nothing else. Get `MASTODON_ACCESS_TOKEN` from
  Preferences > Development > New Application, with `write:statuses` and `write:media` scopes
  ticked — copy "Your access token" specifically, not the client key/secret.
- **Bluesky**: Settings > App Passwords > Add App Password for `BLUESKY_APP_PASSWORD` (never your
  real password), and your handle (e.g. `you.bsky.social`) for `BLUESKY_IDENTIFIER`.

**Troubleshooting tip:** you can always test Telegram/Mastodon credentials directly in your
browser's address bar before touching Vercel — e.g. `https://api.telegram.org/bot<token>/getMe`
or `https://<your-mastodon-base>/api/v2/media` — this never exposes anything to anyone but you.

## Password protection

Set `APP_PASSWORD` in Vercel's Environment Variables to any password you choose. Once set, your
browser will show a plain login prompt asking for a username (type anything) and that password
before it lets you use the app. The image link (`/api/og`) stays open on purpose, since Discord,
Mastodon, Bluesky and Telegram all need to fetch it from the outside — but the page itself and
posting are locked. If you leave `APP_PASSWORD` blank, the app stays fully open to anyone with
the link, which isn't recommended.

## How posting safety works

- Nothing posts automatically. You always see the paragraph and the image first, tick which
  platforms to send to, and click one confirm button.
- Each platform is posted to independently, so if one fails the others still go through, with a
  clear ✅/❌ per platform.

## Files

- `middleware.ts` – the password check (leaves `/api/og` public)
- `app/page.tsx` – the page you use: single post or batch mode, hashtag suggestions, shorten-to-fit
- `app/api/generate/route.ts` – asks Groq for the four paragraphs, in your chosen language
- `app/api/hashtags/route.ts` – asks Groq for relevant hashtag suggestions
- `app/api/shorten/route.ts` – asks Groq to rewrite a post under a platform's character limit
- `app/api/og/route.tsx` – draws the branded image (logo or mascot, 4 layouts, optional QR code)
- `app/api/post/route.ts` – posts to whichever platforms you approved
- `lib/platforms.ts` – the actual API calls to Discord/Telegram/Mastodon/Bluesky
- `lib/postAll.ts` – shared posting logic
- `public/logo.png` – your Vasukii logo, shown in every generated image

## Extra features

- **Hashtag suggestions**: click "💡 Suggest hashtags" after typing a topic - tap any suggested tag to add or remove it from your hashtag list.
- **Shorten to fit**: if a platform's text goes over its character limit, a "✂️ Shorten to fit" button appears under that box.
- **QR code**: fill in the Link field and every generated image automatically gets a small scannable QR code in the bottom-left corner, linking there.
- **Batch mode**: tick "Batch mode" to type several topics (one per line) and generate all of them at once. Review and edit each one, then post them individually or all together.
