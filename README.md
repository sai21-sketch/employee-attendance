# Attendly — Geofenced Attendance Tracker (Supabase edition)

A full-stack attendance app for your consultancy: employees check in only when
they're physically near the office (GPS geofencing), take a selfie at
check-in, and admins get a dashboard to see who's present, late, or absent —
plus trends over time.

This version has **no backend server to host or maintain.** It's a single
React app that talks directly to:

- **Supabase** — free hosted Postgres database, authentication, and two small
  serverless functions (for securely creating/removing employee accounts)
- **Cloudinary** — free image hosting for check-in selfies
- **Cloudflare Pages** — free static hosting for the React app itself

Everything below uses free tiers. No credit card required for any of it.

---

## Overview of what you'll set up

1. A Supabase project (database + auth + 2 Edge Functions)
2. A Cloudinary account (image uploads)
3. A GitHub repo (so Cloudflare Pages can deploy from it)
4. A Cloudflare Pages site (hosts the actual website)

Budget about 30–40 minutes for the first time through.

---

## Part 1 — Supabase setup

### 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign
   up (GitHub login is easiest)
2. Click **New Project**
3. Pick an organization (Supabase creates a default one for you), name the
   project `attendly`, set a database password (save this somewhere — you
   likely won't need it again, but keep it safe), pick the region closest to
   you, and click **Create new project**
4. Wait \~2 minutes while Supabase provisions everything

### 1.2 Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar →
   **New query**
2. Open `supabase-schema.sql` from this project, copy the entire contents,
   paste into the SQL editor
3. Click **Run** (bottom right)
4. You should see "Success. No rows returned" — this created your tables,
   security rules, and a starter company settings row

### 1.3 Get your API credentials

1. Click the **gear icon (Project Settings)** in the sidebar → **API**
2. You'll need two values from this page:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long string under "Project API keys")
3. Keep this tab open, you'll paste these into a `.env` file shortly

### 1.4 Create your first admin account

Since there's no backend to auto-seed an admin user, you create the first
one by hand:

1. In Supabase, click **Authentication** in the sidebar → **Users** → **Add
   user** → **Create new user**
2. Enter your email and a password, check **Auto Confirm User** (so you don't
   need to click an email link), click **Create user**
3. Click **SQL Editor** → **New query**, and run this (replace the email
   with the one you just used):

```sql
update profiles set role = 'admin', name = 'Your Name'
where email = 'you@yourcompany.com';
```

   This works because the schema's trigger already created a `profiles` row
   automatically when you added the user — this just promotes it to admin
   and sets a display name.

4. Confirm it worked:

```sql
select * from profiles;
```

   You should see one row with `role = admin`.

### 1.5 Deploy the two Edge Functions

These are small serverless functions that let admins create/remove employee
accounts securely (the browser can't do this directly without exposing a
secret key). You'll need the Supabase CLI for this — it's free and works
from your Mac terminal.

**Install the CLI:**
```bash
brew install supabase/tap/supabase
```
(If you don't have Homebrew, install it first from [brew.sh](https://brew.sh).)

**Log in and link your project:**
```bash
cd attendly-app    # the folder containing this README
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```
Your project ref is the part of your Project URL before `.supabase.co` —
e.g. if your URL is `https://abcdefgh.supabase.co`, the ref is `abcdefgh`.

**Deploy both functions:**
```bash
supabase functions deploy create-employee
supabase functions deploy delete-employee
```

**Set the secret the functions need** (this is your service_role key — find
it on the same Project Settings → API page as before, under "Project API
keys", labeled **service_role** — keep this one private, never put it in
frontend code):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

That's the entire backend. No server to keep running, no monthly bill.

---

## Part 2 — Cloudinary setup (for check-in selfies)

1. Go to [cloudinary.com](https://cloudinary.com) → **Sign up free**
2. After signing up, you'll land on your **Dashboard** — note your **Cloud
   name** at the top (you'll need this)
3. Go to **Settings** (gear icon) → **Upload** tab
4. Scroll to **Upload presets** → click **Add upload preset**
5. Set:
   - **Preset name**: `attendly-unsigned` (or anything — just remember it)
   - **Signing Mode**: change this to **Unsigned** (important — this is what
     lets the browser upload directly without a secret key)
6. Click **Save**

That's it — Cloudinary is ready to receive check-in photos.

---

## Part 3 — Configure your local `.env`

In the project folder, copy the example file:

```bash
cp .env.example .env
```

Open `.env` in a text editor and fill in the four values you collected:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=attendly-unsigned
```

### Try it locally first

```bash
npm install
npm run dev
```

Open the URL it gives you (usually `http://localhost:5173`), log in with the
admin account you created in step 1.4, go to **Employees** and add a test
employee, then log in as them in a private/incognito window to test the
check-in flow.

---

## Part 4 — Push to GitHub

Cloudflare Pages deploys from a GitHub repo.

1. Go to [github.com/new](https://github.com/new), name it `attendly`,
   leave it empty (no README), click **Create repository**
2. In your terminal, from the project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/attendly.git
git push -u origin main
```

Your `.env` file will **not** be pushed (it's in `.gitignore`) — that's
intentional, since it has your keys in it. You'll re-enter them in
Cloudflare's dashboard in the next step instead.

---

## Part 5 — Deploy to Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) (or
   [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**)
   → sign up / log in
2. Click **Create application** → **Pages** → **Connect to Git**
3. Authorize Cloudflare to access your GitHub account, select the `attendly`
   repo
4. Configure the build:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Before clicking deploy, expand **Environment variables** and add all
   four, exactly as in your local `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`
6. Click **Save and Deploy**

Cloudflare builds and deploys your site — takes about a minute. You'll get a
free URL like `attendly.pages.dev`. That's your live app.

From now on, every time you `git push` to `main`, Cloudflare automatically
rebuilds and redeploys — no manual steps needed.

---

## Day-to-day use

**As admin:**
- Log in at your `.pages.dev` URL
- Go to **Settings** → stand at your office → click "Use my current
  location" → set your check-in radius and work start time → Save
- Go to **Employees** → add each team member with a temporary password,
  share those credentials with them
- Check the **Dashboard** daily for attendance overview, **Records** for
  historical lookups

**As an employee:**
- Log in on your phone or laptop browser
- Allow location access and camera access when prompted
- When the distance ring shows you're in range, tap **Check in now**, take a
  selfie, confirm
- Tap **Check out** at the end of the day

---

## Security notes

- **Camera and GPS access require HTTPS** (or `localhost` for local testing)
  — Cloudflare Pages serves everything over HTTPS automatically, so this
  works fine once deployed.
- **GPS can be spoofed** by tech-savvy users via dev tools or location-faking
  apps. The selfie photo adds a second layer of accountability (you can spot
  someone checking in from home in the photo even if their GPS was faked),
  but neither is fully tamper-proof. Treat this as a strong deterrent, not a
  forensic-grade system.
- **Row Level Security (RLS)** is enabled on every table — employees can
  only ever see their own attendance records, never each other's, even if
  they inspect network requests in dev tools. Only admins can see everyone's
  data.
- The Edge Functions check that the caller is genuinely an admin (via their
  Supabase session) before creating or deleting any account, so a regular
  employee can't call those functions to make themselves an admin.
- Supabase free tier pauses a project after 1 week of total inactivity (no
  API calls at all) — logging in resumes it within a minute or two. With a
  team actually using this daily, you won't hit this.

## Free tier limits to be aware of

- **Supabase free tier**: 500MB database, 1GB file storage (you're using
  Cloudinary instead, so this barely matters), 50,000 monthly active users —
  far more than a 20–100 person team will ever use
- **Cloudinary free tier**: 25 GB storage, 25 GB monthly bandwidth — a daily
  selfie photo per employee for a 50-person team is well within this for
  years
- **Cloudflare Pages free tier**: unlimited bandwidth, 500 builds/month —
  no realistic way to hit this for an internal tool

If your team ever outgrows these (very unlikely at your stated scale), each
service has a paid tier you can upgrade to individually, without needing to
re-architect anything.

## Project structure

```
attendly-app/
├── supabase-schema.sql           # Run this once in Supabase's SQL editor
├── supabase/functions/
│   ├── create-employee/           # Edge Function: admin creates employee
│   └── delete-employee/            # Edge Function: admin removes employee
├── .env.example                    # Copy to .env and fill in your keys
└── src/
    ├── supabaseClient.js             # Supabase connection
    ├── cloudinary.js                  # Photo upload helper
    ├── AuthContext.jsx                 # Login state (Supabase auth)
    ├── components/
    │   ├── AdminLayout.jsx               # Sidebar layout for admin pages
    │   └── DistanceRing.jsx               # Live "how close am I" gauge
    └── pages/
        ├── Login.jsx
        ├── EmployeeDashboard.jsx           # Check-in screen + selfie capture
        ├── AdminDashboard.jsx               # Stats + trend chart
        ├── AdminEmployees.jsx                # Add/remove employees
        ├── AdminRecords.jsx                   # Date-range history + photos
        └── AdminSettings.jsx                   # Office location + radius
```

## Possible next steps

- Employee self-service password change / forgot-password flow (Supabase
  Auth supports this out of the box — just needs a UI for it)
- Export attendance records to CSV/Excel for payroll
- Multiple office locations (add a `locations` table, let employees pick or
  auto-detect the nearest one)
- Custom domain instead of `*.pages.dev` (free on Cloudflare — just add it
  under your Pages project's Custom domains tab)
