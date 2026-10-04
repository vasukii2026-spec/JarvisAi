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

## Post to X, Instagram, LinkedIn... through Buffer

Instead of building each network's own API, the app can publish through your Buffer account.

1. In Buffer, connect your channels (X, Instagram, LinkedIn, Facebook, Threads...). Instagram must be a
   Business/Creator account.
2. Create an API key in Buffer (only the organization owner can). API access is on every plan, including free.
3. Add `BUFFER_API_KEY` to `.env.local` and to Vercel's Environment Variables, then redeploy.
4. Open the app: a "Also post via Buffer" box lists your connected channels. Tick the ones you want.
5. Buffer posts are **added to your Buffer queue** and go out at the channel's next posting slot (set your
   posting schedule inside Buffer). X gets the short version of the text; the other networks get the longer one.
   To publish immediately instead of using the queue, set `BUFFER_MODE=shareNow`.
6. Optional, for automatic posting: set `BUFFER_AUTO_CHANNELS=twitter:CHANNEL_ID,instagram:CHANNEL_ID`
   (get the IDs from the box above or Buffer's API) and `/api/auto-post` will queue to those too.

**Staying inside Buffer's free API limits** (100 requests / 15 min, 250 / day, 3,000 / 30 days): the channel
list is cached (6h on the server, 12h in your browser, "Refresh channels" button to update), each post to a
Buffer channel costs 1 request, and auto-post only uses Buffer every 16th run (3 times a day) - change this
with `BUFFER_AUTO_EVERY_N`. Rough cost with 2 Buffer channels: about 6 requests a day from auto-post.
Check your usage in Buffer's API settings page.

Notes: this uses Buffer's newer GraphQL API (their old REST API shuts down on 1 Feb 2027). The image link
(`/api/og`) must stay public and permanent, because Buffer fetches it when the post goes out.

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

- `middleware.ts` – the password check (leaves `/api/og` and `/api/auto-post` public - they have their own protection)
- `app/page.tsx` – the page you use: single post or batch mode, hashtag suggestions, shorten-to-fit
- `app/api/generate/route.ts` – asks Groq for the four paragraphs, in your chosen language
- `app/api/hashtags/route.ts` – asks Groq for relevant hashtag suggestions
- `app/api/shorten/route.ts` – asks Groq to rewrite a post under a platform's character limit
- `app/api/og/route.tsx` – draws the branded image (logo or mascot, 4 layouts, optional QR code)
- `app/api/post/route.ts` – posts to whichever platforms you approved (manual flow)
- `app/api/auto-post/route.ts` – picks a topic and posts automatically to all 4 platforms, unsupervised
- `lib/generateTexts.ts` – the shared Groq call used by both manual and automatic posting
- `lib/topics.ts` – the rotating list of topics automatic posts draw from - edit this to change what it talks about
- `lib/platforms.ts` – the actual API calls to Discord/Telegram/Mastodon/Bluesky
- `lib/postAll.ts` – shared posting logic
- `public/logo.png` – your Vasukii logo, shown in every generated image

## Extra features

- **Hashtag suggestions**: click "💡 Suggest hashtags" after typing a topic - tap any suggested tag to add or remove it from your hashtag list.
- **Shorten to fit**: if a platform's text goes over its character limit, a "✂️ Shorten to fit" button appears under that box.
- **QR code**: fill in the Link field and every generated image automatically gets a small scannable QR code in the bottom-left corner, linking there.
- **Batch mode**: tick "Batch mode" to type several topics (one per line) and generate all of them at once. Review and edit each one, then post them individually or all together.

## Fully automatic posting (every 30 minutes, all 4 platforms)

This posts for real with no human review step in between - read the safety note at the bottom of
this section before turning it on.

1. Set `VASUKII_WEBSITE` in Vercel to your real website - it's automatically included as the link
   and QR code in every automatic post.
2. Set `AUTO_POST_SECRET` to a random string you make up (e.g. run `openssl rand -hex 16`).
3. **Test it safely first, without posting anything real**, by visiting this in your browser once deployed:
   `https://your-app.vercel.app/api/auto-post?secret=YOUR_SECRET&dry=1`
   This generates a topic, the text, and the image, and shows them back to you as JSON - it does
   NOT post anywhere. Check the wording looks right before going further.
4. When you're happy with it, go to cron-job.org (free, no card needed), sign up, and create a job
   that calls this URL every 30 minutes: `https://your-app.vercel.app/api/auto-post?secret=YOUR_SECRET`
   (no `&dry=1` this time - this one posts for real). When you create the job, set its schedule to
   "every 30 minutes" (cron-job.org's free tier supports intervals down to 1 minute, so 30 is easy).
5. A once-a-day Vercel Cron (`vercel.json`) is included as a harmless backup even without the
   external pinger, but real 30-minute posting needs the pinger above (Vercel's free tier cron only
   runs once a day).

**What it posts about**: a rotating list of generic, safe topics in `lib/topics.ts` (community,
the website, safety tips, engagement) - edit that file any time to change what it talks about. It
deliberately avoids ever inventing prices, statistics, or guarantees, since nobody reviews it
before it goes out.

**⚠ Safety note**: once this is running, real posts go out automatically, unsupervised, to your
real accounts, every 30 minutes - that's up to 48 posts a day, per platform. Check in on what it's
actually posting every so often, especially in the first few hours. If anything looks off, you can
pause it instantly by deleting the cron-job.org job (or pausing it there) - no code change needed.

