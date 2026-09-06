# Cardinal Youth Fiesta — Live Scoreboard

Two pages:
- **index.html** — public standings screen (project on the big screen / share the link)
- **admin.html** — password-protected page for updating scores during the event

Live sync is powered by **Firebase Firestore** (database) + **Firebase Authentication**
(admin login). No backend server needed — just static files, so it hosts free on
GitHub Pages.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it anything
   (e.g. `cardinal-youth-fiesta`).
2. In the project, go to **Build → Firestore Database → Create database**.
   Choose **Production mode** and any region close to you.
3. Go to **Build → Authentication → Get started → Sign-in method** and enable
   **Email/Password**.
4. Still in Authentication, go to the **Users** tab → **Add user** and create the
   admin login you'll use on `admin.html` (e.g. `admin@cardinalhss.school` + a
   password). You can add a few of these — one per teacher who'll be updating scores.

## 2. Get your config and paste it in

1. Project settings (gear icon) → **General** → scroll to **Your apps** →
   click the web icon `</>` → register an app (nickname anything, no need for hosting).
2. Copy the `firebaseConfig` object it gives you.
3. Open **firebase-config.js** in this folder and paste your values into the
   `firebaseConfig` object at the top (replace the `YOUR_...` placeholders).

## 3. Apply the security rules

1. Firestore Database → **Rules** tab.
2. Paste in the contents of **firestore.rules** from this folder, replacing what's there.
3. Click **Publish**.

This keeps the standings and results publicly *readable* (so the scoreboard page works
for everyone) but only *writable* by someone logged in through admin.html.

## 4. House score documents

You don't need to create these manually — the first time you log into `admin.html`,
it automatically creates the four house documents (`yellow`, `green`, `blue`, `red`)
in Firestore with 0 points each, if they don't already exist.

If you ever want to reset the tournament: open Firestore Database in the console,
edit each house doc's `points` field back to `0`, and delete the documents inside the
`announcements` collection (this also clears the admin's Recent Activity list).

## 5. Host it

Easiest option — GitHub Pages:

1. Push this whole folder to a GitHub repo.
2. Repo → **Settings → Pages** → set source to your default branch, root folder.
3. Your public scoreboard will be at `https://<username>.github.io/<repo>/index.html`
   and admin at `.../admin.html`. Keep the admin URL private — only share it with
   the people entering scores.

You can also just open `index.html` locally for testing, but Firebase writes/reads
need the site served over `http(s)`, so use a simple local server
(e.g. `python3 -m http.server`) rather than double-clicking the file, if testing before
deploying.

## How it works

- **Quick Score Update** (admin) — adds/subtracts points directly to a house's running
  total. Use this for anything you don't need a full result announcement for.
- **Result Entry** (admin) — records a student's result (name, class, programme, rank,
  house). The moment you click **Announce Result**, it pops up on the public page with
  an animated intro, holds for ~6 seconds, then fades back into the (already updated)
  overall standings. If you also fill in "Points to add," that amount is added to the
  house's total at the same time.
- The public page never needs to be refreshed — it listens live to Firestore and
  updates automatically, from any number of screens/devices at once.
