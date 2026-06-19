# Leadership Presence — Daily Training

A 10-15 min daily drill tracker for executive presence: voice & pace, the
"so what" compression drill, stillness reps, and disagreement rehearsal.
Built-in timers, daily plan rotation, streaks, and a 14-day progress view.
Progress is saved in your browser's local storage (private to you, this
device only).

## Run it locally

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

## Deploy to GitHub Pages (free hosting)

1. Create a new **empty** repo on GitHub named `leadership-tracker`
   (Settings -> no README, no .gitignore -- keep it empty).
2. From this project folder:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/leadership-tracker.git
   git push -u origin main
   ```

3. On GitHub: go to your repo -> **Settings** -> **Pages** (left sidebar)
   -> under "Build and deployment", set **Source** to **GitHub Actions**.
4. Push triggers a build automatically (see `.github/workflows/deploy.yml`).
   After about 1 minute, your site is live at:

   ```
   https://YOUR-USERNAME.github.io/leadership-tracker/
   ```

   You can check progress under the repo's **Actions** tab.

### If you rename the repo

The `base` path in `vite.config.js` must match your repo name exactly
(currently `/leadership-tracker/`). If you name the repo something else,
update that line before pushing.

## Notes

- Progress is stored via `localStorage`, so it stays on whichever device
  and browser you use it from -- there's no account or sync.
- Built with Vite + React.
