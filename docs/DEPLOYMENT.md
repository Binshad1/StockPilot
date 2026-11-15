# Deployment guide

Three pieces: **MongoDB Atlas** (database) → **Render** (API) → **Vercel or Netlify** (web app). Everything below has a free tier.

## 1. Database — MongoDB Atlas
1. Create a free cluster → **Database Access**: add a user with a strong password.
2. **Network Access**: allow `0.0.0.0/0` (Render's IPs change).
3. **Connect → Drivers**: copy the connection string and add the database name, e.g.
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/stockpilot?retryWrites=true&w=majority`
   (if the password has special characters, URL-encode them).

## 2. API — Render
Either use the blueprint (`render.yaml` in the repo root: **New → Blueprint**) or create a **Web Service** manually:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Environment variables:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | your Atlas string |
| `JWT_SECRET` | long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `CLIENT_URL` | your web app URL, e.g. `https://stockpilot.vercel.app` (comma-separate several) |
| `TIMEZONE` | `Asia/Kolkata` (used to group sales by day) |

After deploy open `https://<service>.onrender.com/api/health` → `{"status":"OK","database":"Connected"}` and `/api/docs` for Swagger.
The free tier sleeps after inactivity; the first request can take ~30 s.

### Demo data on the live database
Run the seed **once from your computer**, pointing at Atlas (it wipes that database):
```bash
cd backend
MONGO_URI="mongodb+srv://…/stockpilot" JWT_SECRET=x npm run seed
```
(Windows PowerShell: `$env:MONGO_URI="…"; $env:JWT_SECRET="x"; npm run seed`)
Or skip seeding: register the first account on the site — it automatically becomes the admin.

## 3. Web app — Vercel (or Netlify)
| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Env var | `VITE_API_URL` = `https://<service>.onrender.com` (no trailing slash) |

`frontend/vercel.json` and `frontend/public/_redirects` already make page refreshes and deep links work. Set `VITE_SHOW_DEMO=false` to hide the demo-login hint on the sign-in page.
After the first deploy, put the final web URL into the API's `CLIENT_URL` and redeploy the API.

## 4. Android APK
1. Set `API_BASE_URL=https://<service>.onrender.com/` in `android/gradle.properties`.
2. Android Studio → **Build → Build APK(s)**.
3. APK: `android/app/build/outputs/apk/debug/app-debug.apk` — attach it to the submission or a GitHub release.

## Checklist before submitting
- [ ] Rotated any database password / JWT secret that was ever shared or committed
- [ ] `/api/health` shows Connected, `/api/docs` opens
- [ ] Can sign in on the live site with the demo accounts, create an order, see stock drop
- [ ] README top section filled with live URLs
- [ ] 2–3 minute screen recording: login → dashboard → add product → stock in → create order (stock drops) → cancel as admin (stock returns) → reports → staff account can't see Reports/Team → phone view / Android app
