# Team Saksham International — website

Live site: **https://teamsakshaminternational.com** (Baja SAE team, VIT Chennai)

Everything on the site — text, photos, members, alumni, sponsors, achievements, blog — is edited from
**/admin** in the browser. You should not need to touch this code to run the site day to day.

This file is the handover doc: where everything lives, who owns it, what renews when, what the free
limits are, and how to make changes safely.

---

## 1. Accounts — all owned by teamsakshaminternational@gmail.com

| Service | What it does | Where to look | Plan |
|---|---|---|---|
| **GitHub** | Source code: `teamsakshaminternational/website`, branch `main` | github.com | Free |
| **Vercel** | Hosting + daily keep-alive cron. Auto-deploys every push to `main` | vercel.com → project `website` | Hobby (free) |
| **Supabase** | Database, logins, image storage. Project ref `cazhbqmbtlvqcahgyvba`, region **Mumbai (ap-south-1)** | supabase.com | Free |
| **Resend** | Sends the alumni sign-in codes and admin alerts | resend.com | Free |
| **Wix** | Domain registrar + DNS only (the old Wix site is retired) | wix.com → Domains | Domain only, paid yearly |
| **Google Cloud** | OAuth client used for admin Google sign-in | console.cloud.google.com | Free |

Keep the Gmail account's recovery options current — it is the key to everything above.

## 2. Stack

- **TanStack Start** (React 19 + Vite, file-based routes, server-side rendering) — `@lovable.dev/vite-tanstack-config`
- **TanStack Router + React Query** for routing and data fetching
- **Tailwind CSS v4** (`src/styles.css` holds the colors, fonts and utilities)
- **Supabase JS** for database, auth and storage
- Deployed as a Vercel function (Nitro auto-detects Vercel at build time)

The project was originally scaffolded with Lovable, which is no longer used. Because the repo is still
linked to Lovable, **never force-push or rewrite history on `main`.**

## 3. Repo map

```
src/
  routes/                 one file = one URL
    index.tsx             home
    about.tsx  achievements.tsx  gallery.tsx  team.tsx  sponsors.tsx
    blog.tsx  blog.$slug.tsx
    alumni.tsx            public alumni wall
    alumni_.join.tsx      /alumni/join — alumni sign-up and self-edit
    admin.tsx             /admin — the whole admin panel
    api.keepalive.ts      /api/keepalive — pinged daily by Vercel cron
    __root.tsx            page shell, nav and footer
  components/
    SiteNav.tsx  SiteFooter.tsx  PageHeader.tsx  Reveal.tsx  CountUp.tsx
    Thumb.tsx             <img> that loads the small "-sm.webp" copy, full size when shown large
    Lightbox.tsx  NewsletterForm.tsx
    admin/
      CrudSection.tsx     generic add/edit/delete/reorder list used by most admin tabs
      AlumniNetwork.tsx   approvals, directory, private contacts, WhatsApp outreach, CSV export
      GraduateMembers.tsx end-of-season "move members to alumni" tool
      SiteImages.tsx      swap the background photos without code
  lib/
    db.ts                 Supabase handle + list/page-content query helpers
    alumni.ts             alumni queries, CSV, Gmail/WhatsApp/URL helpers
    upload.ts             browser-side WebP compression + upload (also writes the -sm thumbnail)
    preload.ts            SSR prefetch so pages arrive with data
  integrations/supabase/  generated client and types
supabase/
  manual/01-initial-setup.sql    tables, RLS, admin rules  (already applied)
  manual/02-alumni-network.sql   alumni network schema      (already applied)
  migrations/                    Lovable-era migrations (historical)
public/                          logo, favicon, hero fallback image
vercel.json                      the daily cron entry
```

`../alumni-notify.sql` (kept outside the repo, with the project owner) adds the "new alumni submitted"
email trigger. `alumni-outreach-PRIVATE.sql` holds alumni phone numbers and **must never be committed.**

## 4. Database

Tables in `public`: `generations`, `generation_photos`, `subteams`, `members`, `alumni`,
`alumni_generations` (which cars an alumnus worked on), `alumni_private` (email, phone, preferences),
`alumni_outreach` (invite list, admin-only), `sponsors`, `achievements`, `blog_posts`, `page_content`
(all editable site text and background image URLs), `newsletter_subscribers`, `admins`.

View `alumni_public_contacts` exposes an email publicly only if the alumnus is approved and ticked
"show my email".

**Security model (row level security is on for every table):**

- Anyone may read published content and **approved** alumni only.
- `is_admin()` = the signed-in email exists in `admins`. Admins can do everything.
- A signed-in alumnus can create and edit **their own** profile; a database trigger (`alumni_guard`)
  stops them changing their own status, so they can never self-approve.
- `approve_alumni(id)` approves a submission and, if it claims an older imported profile, merges the
  two into one row.
- Storage bucket **`media`** is public to read. Admins can write anywhere; alumni can only write
  inside `alumni-submissions/<their user id>/`.

Images are compressed to WebP in the browser before upload, and a smaller `-sm.webp` copy is stored
next to each one for fast listings.

## 5. Logins

- **Admins:** Google sign-in at `/admin`. To add an admin, an existing admin adds the Gmail address in
  the **Admins** tab. Nothing else is needed.
- **Alumni:** no password. They enter their email at `/alumni/join`, get a 6-digit code, and can come
  back to the same page any time with the same email to update their profile.

## 6. Email (Resend)

- Sending domain: `teamsakshaminternational.com`, verified in Resend via DNS records at Wix
  (`resend._domainkey`, `send`, `rsend`, `_dmarc`). **If those DNS records are deleted, all email stops.**
- **Sign-in codes** go out through Supabase → Authentication → Emails → SMTP settings
  (`smtp.resend.com`, port 465, username `resend`, password = Resend API key). The "Magic Link" and
  "Confirm signup" templates must both contain `{{ .Token }}`.
- **Admin alerts:** a Postgres trigger (`alumni_notify_admins`, from `alumni-notify.sql`) calls the
  Resend API with `pg_net` whenever a new alumni profile is submitted, and emails everyone in `admins`.
- Secrets live in **Supabase → Vault**, not in the code: `resend_api_key`, `resend_from`, `site_url`.
  If the API key is ever rotated, update it in Vault *and* in the Supabase SMTP settings.

## 7. The daily ping (keep-alive)

Free Supabase projects are paused after a week with no activity, and a paused project takes the whole
site down. To prevent that:

- `vercel.json` defines a **Vercel cron**: `GET /api/keepalive`, schedule `30 3 * * *` (UTC) — about
  9:00 am IST, once a day. On the Hobby plan crons run once a day at best, within an hour of the time.
- `src/routes/api.keepalive.ts` reads one row from `page_content`, which is enough to count as activity.
- It is **not** scheduled inside Supabase; there is no pg_cron job. Check runs in Vercel → the project
  → Cron Jobs / Logs. If the project ever does get paused, open the Supabase dashboard and restore it.

## 8. Deploying and local development

Any push to `main` deploys automatically; a deploy takes about 20 seconds. There is no build step to
run by hand.

```sh
git clone https://github.com/teamsakshaminternational/website.git
cd website
npm install
npm run dev        # local dev server
npm run build      # production build — run this before pushing anything non-trivial
npx tsc --noEmit   # type check
npm run lint
```

`.env` (already in the repo) holds only the **publishable** Supabase URL and key, which are safe in a
browser; RLS is what protects the data. The same values are set in Vercel → Settings → Environment
Variables. **The Supabase `service_role` key must never be put in this repo or in Vercel.**

If the site ever needs to move to another Vercel account, import the repo, copy those environment
variables, add the domain, and re-point the DNS at Wix.

## 9. What renews / what can break

| Thing | When | What happens if ignored |
|---|---|---|
| **Domain teamsakshaminternational.com** | Yearly, at Wix | Site becomes unreachable. Keep auto-renew on and the Gmail inbox monitored. |
| **Supabase free project** | Paused after ~7 days of no activity | The daily cron prevents this; if it ever pauses, restore it from the dashboard. |
| **HTTPS certificate** | Auto-renewed by Vercel | Nothing to do. |
| **Resend DNS records at Wix** | Permanent | Delete them and emails stop; the domain must stay verified. |
| **Google OAuth client** | Permanent | If the domain changes, add the new origin in Google Cloud and in Supabase URL settings. |
| **Gmail account access** | Ongoing | Losing it means losing every service above. Hand it over deliberately each year. |

## 10. Free-tier limits (checked September 2026 — verify before assuming)

**Supabase Free:** 500 MB database, 1 GB file storage, 50,000 monthly active users, projects paused
after 1 week of inactivity. Our data is text plus compressed WebP photos, so storage is the first thing
to watch; delete unused gallery photos before worrying about upgrading ($25/mo Pro).

**Vercel Hobby:** 100 GB fast data transfer/month, 1,000,000 function invocations/month, 100
deployments/day, cron jobs limited to once per day with ±59 minutes of drift. Note Hobby is for
non-commercial use — fine for a student team site, as long as nothing is sold through it.

**Resend Free:** 3,000 emails/month, 100/day, 3 domains, 30-day log retention. Sign-in codes plus
admin alerts are nowhere near this unless a huge batch of alumni sign up on the same day.

**GitHub Free:** unlimited public repos.

## 11. Everyday tasks

| Task | Where |
|---|---|
| Change any text on a page | Admin → **Page text** |
| Change a background photo | Admin → **Site images** |
| Add a car, gallery photos, members, sponsors, achievements, blog posts | The matching admin tab (drag-free reorder with the ↑ ↓ buttons) |
| Approve a new alumni profile | Admin → **Alumni network → Requests** |
| Fix an alumnus's details or cars | Admin → **Alumni** (edit), cars are the orange chips |
| End of the season: move the graduating batch to alumni | Admin → **Members → Graduate members** (pick the year or "Earlier batch", and the car) |
| Invite alumni over WhatsApp | Admin → **Alumni network → Outreach** |
| Export alumni to a spreadsheet | Admin → **Alumni network** → CSV buttons |
| See newsletter sign-ups | Admin → **Subscribers** (nobody is emailed automatically) |

## 12. Troubleshooting

- **Site loads but no content:** Supabase project paused or the environment variables are wrong. Check
  the Supabase dashboard first.
- **Alumni don't get their code:** Resend domain not verified, Supabase SMTP settings wrong, or the
  hourly email rate limit hit (Supabase → Authentication → Rate Limits).
- **No admin alert email:** check the Vault secrets exist, and Resend → Logs for failures.
- **Can't sign in to /admin:** the email isn't in the `admins` table, or the domain isn't listed in
  Supabase → Authentication → URL Configuration and in the Google OAuth client's JavaScript origins.
- **A deploy failed:** open the failing deployment in Vercel and read the build log; the previous
  deployment stays live, so the site does not go down.

## 13. Ideas that were left for later

- A yearly "please update your profile" email to alumni (Resend is already set up for it).
- Photos for the newest car generation, and batch years for older imported alumni.
