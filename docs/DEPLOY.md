# Put CropOrbit online (free) and keep its NASA data fresh

The plan: the **code** lives in a public GitHub repository, the **website** is served by Netlify, and a **daily job** on GitHub asks NASA for the newest days, rebuilds the site and publishes it to Netlify. No API key is needed for NASA POWER.

## 1. Put the code on GitHub
1. Sign in at https://github.com. Click **+ → New repository**. Name it (for example `croporbit`), choose **Public**, and do **not** add a README, licence or .gitignore.
2. Upload the code (pick one):
   - **GitHub Desktop** (https://desktop.github.com): File → Add local repository → choose the unzipped `croporbit` folder (the one that contains the hidden `.git` folder) → Publish repository, and untick "Keep this code private".
   - **git in a terminal**, inside the unzipped `croporbit` folder:
     ```
     git remote add origin https://github.com/<your-github-username>/<repo>.git
     git push -u origin main
     ```
     If asked to sign in, use your GitHub username and a **personal access token** as the password (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic), tick `repo` and `workflow`).
   - The browser drag-and-drop upload does **not** work: it accepts at most 100 files and skips the hidden `.github` folder.
3. To keep your private email out of future commits, set your GitHub "no-reply" address first (GitHub → Settings → Emails → "Keep my email addresses private"):
   ```
   git config user.email "<id>+<username>@users.noreply.github.com"
   ```

## 2. Publish the website on Netlify
The zip `croporbit-site.zip` is the ready-built site.
1. Go to https://app.netlify.com/drop, sign in, and drag the unzipped `croporbit-site` folder onto the page. (To replace the content of an existing site, open that site in Netlify → **Deploys** and drag the folder onto the deploy area.)
2. Rename the site under **Site configuration → Change site name** if you like, for example `croporbit.netlify.app`.

## 3. Turn on the daily refresh
The workflow `.github/workflows/refresh.yml` runs every day at 02:30 Bangladesh time. It needs two secrets so it can publish to your Netlify site.
1. **Site ID:** Netlify → your site → **Site configuration → General → Site details → Site ID**. Copy it.
2. **Token:** Netlify → your avatar → **User settings → Applications → Personal access tokens → New access token**. Copy it (shown once).
3. In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**. Add `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` with those values. Never put them in a file in the repo.
4. Test it now: **Actions → Daily NASA data refresh → Run workflow**. A green run takes a few minutes. Open the site: the footer says "Data up to …" with the newest NASA day, and each district page has a "Live from NASA POWER" panel.

Good to know:
- The job asks NASA only for the recent gap and re-requests the last 120 days because NASA revises its newest values. NASA releases new days with a lag of a few days, so "Data up to" will trail today by that lag.
- If NASA is unreachable, the data is stale, or a test fails, the job stops **before** publishing. The live site keeps its previous version and GitHub marks the run red.
- Without the two secrets the job still runs and attaches the rebuilt site as a downloadable file called `site` on the run page, which you can drag onto Netlify yourself.
- GitHub pauses scheduled jobs in a public repository after 60 days without any repository activity. If that happens, open **Actions**, enable the workflow again, or push any small change.
- The raw NASA files (about 26 MB) are **not stored in the repository**. The first run downloads the full 1981-to-today record for all 45 grid cells, which takes several minutes, and saves it in a GitHub Actions cache. Later runs reuse the cache and ask NASA only for the recent gap. If the cache is ever cleared, the next run simply downloads everything again. To rebuild from scratch on your own computer, see the "Run it" section of the README.
- The site files in `public/data/climate/` are the last result of that analysis and are committed so the site builds without the raw data.

## 4. Optional: also publish on GitHub Pages
`.github/workflows/pages.yml` is manual only. Use it if you also want a copy at `https://<username>.github.io/<repo>/`: set **Settings → Pages → Source: GitHub Actions**, then **Actions → Deploy to GitHub Pages (optional, manual) → Run workflow**. It publishes the data stored in the repo, not the daily refresh.

## Check before you submit
- Open the site on a phone and a laptop. It opens in English; the button at the top right switches to Bangla.
- Open a district page: the "Live from NASA POWER" panel should say the data was just fetched. If it says NASA could not be reached on a normal internet connection, the live panel is blocked for that device, and the page still shows the last saved NASA data and its date.
- Visit the home page, a district page and the Field Control page once online; after that they also open offline.
- The globe's satellite layer needs internet; without it the globe falls back to the built-in offline map.

## Troubleshooting
| Problem | Fix |
|---|---|
| Daily run is red | Open the run and read the failing step. A NASA error or "stale" message means NASA was unreachable or not updated; the site was not changed. Re-run later with **Run workflow**. |
| Run is green but the site did not change | Check the `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` secrets exist (the "Publish to Netlify" step is skipped without them). |
| `npm ci` fails | Check that `package-lock.json` was uploaded. |
| Styles or globe missing | You probably opened `index.html` straight from your computer. Use the online link, or run `npm run build && npm start` locally. |
| GitHub Pages shows 404 | Pages is optional. Set **Settings → Pages → Source: GitHub Actions** and run the manual Pages workflow; the link must end with the repository name. |
