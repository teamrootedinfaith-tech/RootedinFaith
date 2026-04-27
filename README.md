# Morning Grace — Deployment Guide

Your app is ready to launch. Follow these steps to go live in under 30 minutes.

---

## What's in this folder

```
index.html       ← The full app (mobile + desktop optimized)
manifest.json    ← PWA config (makes it installable on phones)
sw.js            ← Service worker (offline support)
vercel.json      ← Vercel deployment config
api/
  generate.js    ← Secure API route (keeps your Anthropic key private)
icons/
  icon-192.png   ← App icon (you need to add this — see Step 2)
  icon-512.png   ← App icon large (you need to add this — see Step 2)
```

---

## Step 1 — Get a free Vercel account

1. Go to **vercel.com** and sign up (free)
2. Connect your GitHub account when prompted

---

## Step 2 — Add your app icons

Your icons should be square PNG files:
- `icons/icon-192.png` — 192×192 pixels
- `icons/icon-512.png` — 512×512 pixels

**Quick option:** Use your logo on a white background.
**Free tool:** canva.com → create a 512×512 design → export as PNG → resize to 192×192 for the second file.

Place both files in the `icons/` folder before deploying.

---

## Step 3 — Push to GitHub

1. Create a new repository at **github.com/new**
2. Name it `morning-grace` (or whatever you like)
3. Upload all files from this folder to that repository
   - Drag and drop works fine in the GitHub web interface
   - Make sure the `api/` and `icons/` folders are included

---

## Step 4 — Deploy on Vercel

1. Go to **vercel.com/dashboard**
2. Click **"Add New Project"**
3. Select your `morning-grace` GitHub repository
4. Click **Deploy** — Vercel auto-detects the setup

Your app will be live at: `https://morning-grace-[yourname].vercel.app`

---

## Step 5 — Add your Anthropic API key (REQUIRED)

Without this, the prayer and devotional content won't generate.

1. Get your API key at **console.anthropic.com**
2. In Vercel: go to your project → **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (your full key)
4. Click Save, then go to **Deployments** → **Redeploy** (pick the latest deployment)

---

## Step 6 — Connect your custom domain (optional)

1. In Vercel: go to your project → **Settings** → **Domains**
2. Add your domain (e.g. `app.yourmembership.com`)
3. Follow Vercel's DNS instructions — usually done in 5 minutes

---

## Step 7 — Tell your members how to install it

**iPhone:**
> Open the link in Safari → tap the Share icon → tap "Add to Home Screen" → tap Add

**Android:**
> Open the link in Chrome → tap the three dots menu → tap "Add to Home Screen"

---

## How the daily prayer works

- First open of the day: a new prayer is AI-generated and cached locally
- Every subsequent open that day: instant load from cache (no API call)
- At midnight, the date-key changes → a fresh prayer generates on first open
- Members can tap "Generate New Prayer" anytime for a fresh one

---

## Costs to run this

| Service | Cost |
|---|---|
| Vercel hosting | Free |
| Anthropic API | ~$0.003 per content generation |
| Custom domain | ~$12/year |

For 500 members each opening the app once a day, expect roughly **$1-2/month** in API costs.

---

## What's next (when you're ready)

- **User accounts** — Add Supabase auth so members have private journals synced across devices
- **Push notifications** — Daily morning reminders via OneSignal (free tier)
- **Admin dashboard** — See engagement stats
- **Branded icon + splash screen** — Full native feel

---

Built with care. Questions? Take this README to your developer or Claude for the next phase.
