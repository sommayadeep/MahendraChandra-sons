# Owner/Admin Panel Setup

## 1) Install backend dependencies

```bash
cd backend
npm install
```

## 2) Configure backend `.env`

Create `backend/.env` and set:

- `PORT=5001`
- `MONGODB_URI=...`
- `JWT_SECRET=...`
- `JWT_EXPIRE=7d`
- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`

## 3) Start backend server

```bash
cd backend
npm run dev
```

If owner login fails, run one-time reset:

```bash
cd backend
npm run reset-owner-admin
```

## 4) Open owner panel

- Login page: `http://localhost:5001/admin/login.html`
- Dashboard: `http://localhost:5001/admin/dashboard.html`

## 5) Admin login API

- Endpoint: `POST /api/auth/admin/login`
- Only users with `role=admin` are allowed.

## 6) Owner APIs used by dashboard

- Products:
  - `GET /api/products`
  - `POST /api/products` (multipart/form-data with `image`)
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`
- Orders:
  - `GET /api/orders`
  - `PUT /api/orders/:id/accept`
  - `PUT /api/orders/:id/tracking`
  - `PUT /api/orders/:id/status`
  - `DELETE /api/orders/:id`

All owner routes require:

- `Authorization: Bearer <token>`
