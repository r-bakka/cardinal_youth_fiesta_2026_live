# Cardinal Youth Fiesta — Live Scoreboard

The public page is built from your own poster art in **/assets** (background,
title banner, the four house cards, school logo). It's a fixed-proportion
"stage" that scales as one piece to any screen — like a poster shrinking or
growing, not a page that reflows. If you ever swap in new art, keep the same
filenames (`bg.png`, `title.png`, `logo.png`, `card-yellow.png`, `card-green.png`,
`card-blue.png`, `card-red.png`) and it'll drop right in.


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

## Updating the site later (cache-busting)

Every local CSS/JS file is loaded with a `?v=2` on the end (e.g. `styles.css?v=2`,
`app.js?v=2`) in `index.html`/`admin.html`, and `app.js`/`admin.js` import
`firebase-config.js` the same way. Browsers (and especially projector/TV
browsers, which cache aggressively) treat `file.js?v=2` as a different file
from `file.js?v=1`, so this is what forces everyone to pick up your latest
version instead of an old cached copy.

**Whenever you edit `styles.css`, `admin-styles.css`, `app.js`, `admin.js`, or
`firebase-config.js` and re-upload,** bump every `?v=2` in this project up by
one (to `?v=3`, then `?v=4`, ...) — in `index.html`, `admin.html`, `app.js`,
and `admin.js`. It doesn't matter what the number is, only that it changes.

## Removing a result

Each row in the admin's **Recent Activity** list has a small ✕ button. Removing
a result deletes it from the public activity log and, if it had added points,
subtracts that same amount back off the house's total — so the standings stay
consistent. This can't be undone from the UI (though the house's total can
always be corrected again with **Quick Score Update** if needed).


## How it works

- **Quick Score Update** (admin) — adds/subtracts points directly to a house's running
  total. Use this for anything you don't need a full result announcement for.
- **Result Entry** (admin) — records a student's result (name, class, programme, rank,
  house). The moment you click **Announce Result**, it pops up on the public page with
  an animated intro, holds for ~6 seconds, then fades back into the (already updated)
  overall standings. If you also fill in "Points to add," that amount is added to the
  house's total at the same time.
- **Recent Activity** (admin) — every result you've entered, newest first. Each row has:
  - **👁 Show Again** — replays that result's animation on the public screen right now,
    without creating a duplicate entry. Handy in a lull between events.
  - **✕ Remove** — deletes the result. If it had added points, those points are
    automatically subtracted back out of that house's total, so the standings stay correct.
- **Thoughts / Announcement** (admin) — a free-text box for anything that isn't a result:
  "Lunch break in 10 minutes," a shoutout, a reminder. **Publish** shows it on the public
  screen with the same intro/outro animation as a result. Past messages get the same
  **👁 Show Again** / **✕ Remove** controls as results.
- The public page never needs to be refreshed — it listens live to Firestore and
  updates automatically, from any number of screens/devices at once.

## Cache-busting when you edit the code

`index.html` and `admin.html` load `styles.css`, `admin-styles.css`, `app.js`, and
`admin.js` with a `?v=3` on the end (and `app.js`/`admin.js` import `firebase-config.js`
the same way). That query string is what makes browsers — and especially a projector or
kiosk device that's been showing the same tab for hours — fetch your latest file instead
of a cached copy. **Whenever you edit any of those files, bump the number** (`?v=4`, then
`?v=5`, …) in every place it appears — both HTML files' `<link>`/`<script>` tags, and the
`import ... from "./firebase-config.js?v=3"` line at the top of `app.js` and `admin.js`.
It only needs to be *different from before*, not sequential — a quick find-and-replace
across all four files is enough.

## If you already deployed an earlier version

This update adds a `publishedAt` field to result/message documents (separate from the
original `timestamp`/`createdAt`) so "Show Again" can re-trigger the public screen
without creating a new entry. Anything created before this change won't have that field.
It'll still show up fine in the admin lists, but won't appear in the "currently showing"
live query until you press **Show Again** on it once (which sets `publishedAt` for the
first time). Nothing needs to be manually fixed in Firestore.

