# Dalton Physique OS — Phase 1

A coach-client fitness platform. Phase 1 scope: coach login, client login, coach dashboard
(client list + create client), client dashboard (weight tracking, nutrition targets, training
plan, progress photo uploads), and coach-side nutrition/training plan assignment.

Not included in Phase 1 (intentionally — see the architecture doc for V2/V3): check-ins, coach
feedback threads, alerts, recovery tracking, logbook, PR tracker, payments.

---

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com), sign in, click **New Project**.
2. Pick a name, a database password (save it somewhere), and a region close to you.
3. Wait ~2 minutes for it to provision.

## 2. Run the database schema

1. In your Supabase project, open **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Open `supabase/schema.sql` from this project, copy the entire contents, paste it in.
4. Click **Run**. You should see "Success. No rows returned."

This creates every table, every security policy, and the photo storage bucket in one shot.

## 3. Get your API keys

1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. In this project folder, copy `.env.example` to a new file named `.env`.
4. Paste your values in:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## 4. Turn off email confirmation (recommended for Phase 1)

Since you're manually creating client accounts rather than running public signup, email
confirmation just adds friction. To turn it off:

1. In Supabase, go to **Authentication → Providers → Email**.
2. Turn off **Confirm email**.
3. Save.

If you'd rather keep confirmation on, that's fine too — clients will just need to click a
confirmation link in their inbox before their first sign-in.

## 5. Run it locally to test

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

1. Click **New Coach Account**, create yourself as a coach.
2. Sign in.
3. You'll land on `/coach`. Click **+ New Client** and create a test client account
   (use a real or test email + a temporary password you make up).
4. Sign out, sign back in as that client to confirm the client dashboard works:
   log a weight, try uploading a photo.
5. Sign back in as the coach, click into that client, and assign a nutrition plan and
   a training plan. Sign back in as the client to confirm the plan now shows up.

## 6. Deploy to Netlify

1. Push this project to a GitHub repository (Netlify deploys from Git).
2. In [Netlify](https://app.netlify.com), click **Add new site → Import an existing project**.
3. Connect your GitHub repo.
4. Build settings should auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Before deploying, go to **Site configuration → Environment variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (same values as your local `.env`)
6. Click **Deploy**.

Your platform is now live at the Netlify URL it gives you. You can add a custom domain later
under **Domain management**.

---

## How client accounts work in Phase 1

There's no public client signup page. You (the coach) create each client's account from
inside the coach dashboard with their email and a temporary password you choose. You then
share that email/password with the client directly (text, email, whatever). They sign in
at the same `/login` page — the app automatically routes them to the client dashboard
based on their role.

This is intentional for Phase 1: simplest possible auth flow, no invite-email infrastructure
to configure. V2 can add proper invite links if you want it.

## How plan assignment works

Nutrition and training plans are versioned, not edited in place. When you save a new plan for
a client, the old one is marked inactive (kept in the database, just not shown) and the new
one becomes the active plan the client sees. This means you always have a history of what a
client was on, even though Phase 1 doesn't have a UI to browse that history yet.

## Security model

Every table has Postgres row-level security turned on. A client can only ever read/write rows
where they are the `client_id`. A coach can only read rows for clients whose `coach_id` matches
their own account. This is enforced by the database itself, not by the app's code — even if
there were a bug in the React code, the database would still refuse a cross-client read.

## Project structure

```
src/
  lib/
    supabase.js        — Supabase client setup
    AuthContext.jsx     — current user + profile + role, available everywhere
  pages/
    Login.jsx           — sign in + one-time coach account creation
    client/
      ClientDashboard.jsx
    coach/
      CoachDashboard.jsx     — client list + create client
      ClientDetail.jsx       — single client view + plan assignment
  App.jsx              — routing + role-based access control
  index.css            — all styling
supabase/
  schema.sql           — run once in Supabase SQL Editor
```

## What's next (V2)

See the architecture document for the full roadmap. The next features in priority order:
weekly check-ins, coach feedback replies, the "needs attention" alerts list, and recovery
tracking. None of them require changes to what's already built — they're additive.
