# Miles Kelly website starter

This is a custom, responsive website starter for GitHub Pages with:
- Home page and recent articles
- About page editable only by an authenticated admin
- Articles published by the admin
- Guest article submissions that stay private until reviewed
- Admin dashboard for editing About text, publishing articles, and approving/rejecting submissions

## Important: this needs one-time setup

GitHub Pages hosts the public website, but it does not provide secure accounts or a database. This starter uses Supabase's free tier for authentication and data. Until you connect Supabase, the pages show setup placeholders and forms will not save data.

## 1. Create the GitHub Pages repository

1. Sign in to GitHub and make sure your username is `mileskelly` (otherwise the address will use your actual username).
2. Create a **public** repository named exactly `mileskelly.github.io`.
3. Upload all files from this folder to the root of the repository.
4. In repository **Settings → Pages**, set publishing to the `main` branch and `/ (root)`.
5. Your site should publish at `https://mileskelly.github.io/` after GitHub finishes building it.

## 2. Create a Supabase project

1. Go to https://supabase.com/ and create a project.
2. In the Supabase SQL Editor, run all the contents of `schema.sql`.
3. Open **Project Settings → API** (or API Keys, depending on the dashboard version) and copy the Project URL and the anon/publishable key.
4. Paste them into `config.js` as `supabaseUrl` and `supabaseAnonKey`.
5. Commit the updated `config.js` to GitHub. The anon/publishable key is meant to be public in a browser app; **never put a service-role or secret key in this website**.

## 3. Make your account the admin

1. In Supabase, open **Authentication → Users** and create your own account with an email/password. Do not build a public sign-up page for admin access.
2. Copy your user's UUID.
3. In the SQL Editor, run the final `insert into public.profiles...` statement in `schema.sql`, replacing `YOUR_AUTH_USER_UUID` with your actual UUID.
4. Open `https://mileskelly.github.io/admin.html`, sign in with that account, and test saving the About page and publishing an article.

Only users whose profile role is `admin` can change the About page or publish articles. Public submissions are stored as pending and cannot be read publicly; you review them in the admin dashboard.

## 4. Test before sharing

- Open the About page and make sure your saved text appears.
- Publish a test article from the admin dashboard.
- Submit a guest article from the Submit page and make sure it appears in the admin review queue but not in public Articles.
- Test from a signed-out browser window.

## Notes and limits

- This starter does not include image uploads, comments, likes, or email notifications.
- The submit form asks for an email for editorial follow-up. Keep submissions and personal contact details private.
- Supabase's free plan limits and terms can change.
- GitHub Pages repositories are public, so source files are visible. Do not place passwords, private keys, or personal data in source files.
- This is a starter project; do a careful test of security policies before collecting real submissions.
