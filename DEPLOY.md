# How to put Aasha Setu online

You will use three free websites:

- **Supabase** — the database
- **Render** — the backend (the API)
- **Cloudflare Pages** — the frontend (what people see)

Total time: about 15 minutes. No credit card needed.

Do the steps in order. Where it says **COPY THIS**, keep the value handy — you
paste it into a later step.

---

## Step 0 — Push your code to GitHub

The other sites read your code from GitHub, so it must be up to date.

```
git push origin main
```

---

## Step 1 — Database (Supabase)

1. Go to **https://supabase.com** and sign in with GitHub.
2. Click **New project**.
   - Give it a name (e.g. `aasha-setu`).
   - Set a **database password** and save it somewhere.
   - Pick the region closest to you.
   - Click **Create new project** and wait ~2 minutes.
3. In the left sidebar: **Project Settings** (gear icon) → **Database**.
4. Find **Connection string**. Switch the mode selector to **Session pooler**
   (NOT "Direct connection" — that one is IPv6-only and Render can't reach it).
   Copy the URI. It looks like:
   `postgresql://postgres.abcd1234:[YOUR-PASSWORD]@aws-0-xxx.pooler.supabase.com:5432/postgres`
5. Replace `[YOUR-PASSWORD]` with the password from step 2.

   Use **Session pooler (port 5432)**. Do not use the Transaction pooler
   (port 6543) — it breaks database migrations for this app.

**COPY THIS** — call it `DATABASE_URL`.

---

## Step 2 — Backend (Render)

1. Go to **https://render.com** and sign in with GitHub.
2. Click **New +** (top right) → **Blueprint**.
3. Choose your `aasha-setu` repository → click **Connect**.
4. Render finds the `render.yaml` file and shows a service called
   **drishti-api**. Click **Apply** / **Create**.
5. The first build will fail or wait — that's fine, you haven't added the
   database yet. Now add it:
   - Open the **drishti-api** service → **Environment** (left menu).
   - Click **Add Environment Variable** and add:
     | Key | Value |
     |-----|-------|
     | `DATABASE_URL` | the value you copied in Step 1 |
     | `LLM_API_KEY` | your Gemini key (optional — skip to disable the chatbot) |
   - Click **Save Changes**. Render redeploys automatically.
6. Watch **Logs**. On every deploy the backend runs the migrations and loads
   the demo data automatically (25 risk zones, 5 shelters, 5 responders, 2
   alerts), then starts. Wait until you see `Application startup complete`.
7. At the top of the service page, copy its address, e.g.
   `https://drishti-api.onrender.com`.

**COPY THIS** — call it `BACKEND_URL`.

Quick check: open `BACKEND_URL/api/v1/health` in a browser. You should see
`{"status":"ok","database":"ok"}`.

---

## Step 3 — Frontend (Cloudflare Pages)

The frontend has no server code — it's a static export, so Cloudflare Pages
hosts it directly with no build adapter.

1. Go to **https://dash.cloudflare.com** → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git** → pick the same repository.
2. Build settings:
   | Setting | Value |
   |---|---|
   | Framework preset | Next.js (Static HTML Export) |
   | Root directory | `frontend` |
   | Build command | `npm run build` |
   | Build output directory | `out` |
3. **Environment variables** → add:
   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | your `BACKEND_URL` **plus `/api/v1`** — e.g. `https://drishti-api.onrender.com/api/v1` |
4. Click **Save and Deploy**, wait ~1 minute.
5. Cloudflare gives you a link like `https://aasha-setu.pages.dev`.

**COPY THIS** — call it `FRONTEND_URL`.

### Optional: your own domain

Already have a domain (e.g. bought on GoDaddy)? Point it at Cloudflare
Pages instead of using the `.pages.dev` link:

1. In the same Pages project → **Custom domains** → **Set up a domain** →
   type your domain.
2. If the domain isn't already on this Cloudflare account: **Add a site** in
   the main Cloudflare dashboard first, which gives you two nameservers
   (like `xxx.ns.cloudflare.com`).
3. At your registrar (GoDaddy → your domain → **Manage DNS** / **Nameservers**),
   replace the existing nameservers with those two.
4. Wait for propagation (usually under an hour, can take up to 48h). Cloudflare
   emails you once it's active; the domain then shows "Active" in the
   dashboard and SSL is issued automatically.
5. Update `FRONTEND_URL` below to your real domain.

---

## Step 4 — Connect the two (CORS)

Right now the backend blocks the frontend. Fix it:

1. In `render.yaml`, set `CORS_ORIGINS` to your `FRONTEND_URL` — e.g.
   `https://aasha-setu.pages.dev` (add your custom domain too, comma-separated,
   once it's active).
2. Commit and push. Render syncs the Blueprint and redeploys. (Don't set it
   in the dashboard — the next sync would overwrite it.)

Now open your `FRONTEND_URL`. Register an account and log in — the home page
should show risk cards and nearby shelters.

---

## Step 5 — Make a command-center login

Normal sign-up only creates a "citizen" account. To see the dashboard:

1. Register a citizen account in the app (use your phone number).
2. In **Supabase** → **SQL Editor** → **New query**, run (put your phone in):
   ```sql
   update users set role = 'admin' where phone = '9990001111';
   ```
3. Log out and log back in. You now land on `/dashboard`.

Done. Your site is live.

---

## Things to know about the free tiers

- **The backend sleeps after ~15 minutes of no traffic.** The next visit takes
  30–60 seconds to wake it up, then it's fast again. Live updates reconnect
  on their own. Upgrade Render, or use Railway / Fly.io, if you need it always
  awake.
- **Uploaded photos disappear on each redeploy** (the backend has no permanent
  disk on the free plan). Fine for a demo.
- The map uses free OpenStreetMap tiles — fine for demo traffic.

## Updating later

- Push to `main` → Cloudflare Pages and Render redeploy by themselves.
- To reset the demo data, run this from your own machine (Render's free tier
  has no shell):
  ```
  cd backend
  DATABASE_URL="<your Supabase session-pooler URL>" venv/bin/python -m app.scripts.seed_demo_data --force
  ```
