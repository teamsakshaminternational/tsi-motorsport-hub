# TSI Motorsport Hub

Build a website for Team Saksham International (TSI), a VIT Chennai Baja SAE team. Stack: React + Vite + TypeScript + Tailwind, with Supabase for the database, Google login and image storage. Style: dark, bold, motorsport. Use black with orange/amber (#E8961E) accents, a strong display font, smooth scroll animations and a mobile-first layout.

Public pages: Home (hero, highlights), About, Achievements, Gallery (the main page: cars grouped by generation, each with a photo grid and lightbox), Team (members grouped by subteam, e.g. Drivetrain, with photo, name and position), Sponsors, Blog, Alumni (grouped by batch year), Newsletter signup.

Admin (/admin): Google sign-in. Access only if the user's email is in the admins table. Full add, edit, delete and reorder for generations and their photos, subteams, members, alumni, sponsors, achievements and blog posts, plus admin management. Photo uploads go to Supabase Storage and are compressed to WebP in the browser before upload. All content is read from Supabase; nothing is hardcoded. use this git repo to push code "teamsakshaminternational/website"

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f7f0d4d3-d1f1-4121-91ba-e83a3ac987db).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
