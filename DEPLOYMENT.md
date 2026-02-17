# Deployment Checklist (Render + Vercel)

## 1) Backend on Render

This repo includes `render.yaml` already.

### Option A: Blueprint deploy
1. Connect GitHub repo in Render.
2. Use **Blueprint** deploy from `render.yaml`.

### Option B: Manual Web Service
1. New Web Service from this repo.
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`

### Backend env vars (Render)
Set these in Render dashboard:

- `PORT=5001`
- `MONGODB_URI=...` (MongoDB Atlas URI)
- `JWT_SECRET=...`
- `JWT_EXPIRE=7d`
- `FRONTEND_URL=https://your-frontend.vercel.app`
- `FRONTEND_URLS=https://your-frontend.vercel.app,https://www.yourdomain.com` (optional)
- `OWNER_EMAIL=mahendrachandra.sons@gmail.com`
- `OWNER_PASSWORD=owner12345`
- `OWNER_PASSWORD_LEGACY=Owner@12345,mahendrachandra&sons790275@gmail.com`
- `OWNER_NAME=Mahendra Chandra Owner`
- `DEFAULT_ADMIN_PASSWORD=admin123` (or your value)
- Optional email vars: `SMTP_SERVICE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `CONTACT_RECEIVER_EMAIL`
- Optional Cloudinary vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

After deploy, note backend URL:
- Example: `https://mcsons-backend.onrender.com`

## 2) Frontend on Vercel

In Vercel project settings, set:

- `NEXT_PUBLIC_API_URL=https://mcsons-backend.onrender.com/api`
- `NEXT_PUBLIC_ADMIN_PANEL_URL=https://mcsons-backend.onrender.com/admin/login.html`
- `NEXT_PUBLIC_OWNER_EMAILS=mahendrachandra.sons@gmail.com,mahendrachandra.sons&gmail.com`
- `NEXT_PUBLIC_OWNER_ACCESS_CODE=owner12345`

Then redeploy frontend.

## 3) Post-deploy quick tests

1. Open frontend URL and login with owner credentials.
2. Open `/owner-basic` and add a product.
3. Open admin panel link and verify product/order actions.
4. Place test order from customer side and update status from owner side.
