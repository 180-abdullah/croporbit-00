# Put CropOrbit online (free) and keep its NASA data fresh

The plan: the **code** and the **website** both live on GitHub. The website is served by GitHub Pages, and a **daily job** (GitHub Actions) asks NASA for the newest days, rebuilds the site and publishes it. No API key is needed for NASA POWER, and no other service is needed.

## 1. Put the code on GitHub
1. Sign in at https://github.com. Click **+ → New repository**. Name it (for example `croporbit`), choose **Public**, and do **not** add a README, licence or .gitignore. (On a free plan, GitHub Pages only works for public repositories.)
2. Upload the code (pick one):
   - **GitHub Desktop** (https://desktop.github.com): File → Add local repository → choose the unzipped `croporbit` folder (the one that contains the hidden `.git` folder) → Publish repository, and untick "Keep this code private".
   - **git in a terminal**, inside the unzipped `croporbit` folder:
     ```
     git remote add origin https://github.com/<your-github-username>/<repo>.git
     git push -u origin main
     ```
     If asked to sign in, use your GitHub username and a **personal access token** as the password (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic), tick `repo` and `workflow`).
   - The browser drag-and-drop upload does **not** work: it accepts at most 100 files and skips the hidden `.github` folder.
3. To keep your private email out of commits, set your GitHub "no-reply" address first (GitHub → Settings → Emails → "Keep my email addresses private"):
   ```
   git config user.email "<id>+<username>@users.noreply.github.com"
   ```

## 2. Turn on GitHub Pages (once)
**Settings → Pages → Build and deployment → Source: GitHub Actions.** Nothing else to choose.

## 3. Publish the site and turn on the daily refresh
The workflow `.github/workflows/refresh.yml` runs every day at 02:30 Bangladesh time. Start it now:
1. **Actions → Daily NASA data refresh → Run workflow.** The first run downloads NASA's full record and takes several minutes.
   - To test only the Pages setup, tick **"Use the data saved in the repository"** before you click Run. That publishes the site without asking NASA.
2. When both jobs (`build` and `deploy`) are green, open `https://<your-github-username>.github.io/<repo>/`. The footer says "Data up to …" with the newest NASA day, and each district page has a "Live from NASA POWER" panel. (For a repository named `<username>.github.io` the address is `https://<username>.github.io/`.)

Good to know:
- The job asks NASA only for the recent gap and re-requests the last 120 days because NASA revises its newest values. NASA releases new days with a lag of a few days, so "Data up to" will trail today by that lag.
- If NASA is unreachable, the data is stale, or a test fails, the job stops **before** publishing. The live site keeps its previous version and GitHub marks the run red.
- GitHub pauses scheduled jobs in a public repository after 60 days without any repository activity. If that happens, open **Actions**, enable the workflow again, or push any small change.
- The raw NASA files (about 26 MB) are **not stored in the repository**. The first run downloads the full 1981-to-today record for all 45 grid cells and saves it in a GitHub Actions cache. Later runs reuse the cache and ask NASA only for the recent gap. If the cache is ever cleared, the next run simply downloads everything again. To rebuild from scratch on your own computer, see the "Run it" section of the README.
- The site files in `public/data/climate/` are the last result of that analysis and are committed so the site builds without the raw data.
- `.github/workflows/pages.yml` is a spare manual deploy that publishes only the saved data. You do not need it.
- `.github/workflows/ci.yml` runs the tests and a test build on every push.

## Check before you submit
- Open the site on a phone and a laptop. It opens in English; the button at the top right switches to Bangla.
- Open a district page: the "Live from NASA POWER" panel should say the data was just fetched. If it says NASA could not be reached on a normal internet connection, the live panel is blocked for that device, and the page still shows the last saved NASA data and its date.
- Visit the home page, a district page and the Field Control page once online; after that they also open offline.
- The globe's satellite layer needs internet; without it the globe falls back to the built-in offline map.

## Troubleshooting
| Problem | Fix |
|---|---|
| Deploy job fails with "Pages not enabled" or a 404 | Do step 2: **Settings → Pages → Source: GitHub Actions**, then run the workflow again. The repository must be public on a free plan. |
| Daily run is red | Open the run and read the failing step. A NASA error or "stale" message means NASA was unreachable or not updated; the site was not changed. Re-run later with **Run workflow**, or tick "Use the data saved in the repository". |
| Link shows 404 | The address must end with the repository name, for example `…github.io/croporbit-2/`. |
| `npm ci` fails | Check that `package-lock.json` was uploaded. |
| Styles or globe missing | You probably opened `index.html` straight from your computer. Use the online link, or run `npm run build && npm start` locally. |
