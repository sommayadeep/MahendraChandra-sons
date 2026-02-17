# Mahendra Chandra & Sons - Premium Bag Brand eCommerce

A production-ready full-stack eCommerce application for "Mahendra Chandra & Sons" - a premium bag brand selling handbags, trolley luggage, travel bags, and backpacks.

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- Tailwind CSS
- Framer Motion
- Axios

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcrypt

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas Account (cloud) OR local MongoDB installation

### Step 1: Setup MongoDB

**Option A: MongoDB Atlas (Recommended for Production)**
1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string (should look like: `mongodb+srv://username:password@cluster.mongodb.net/mc-sons`)
4. Replace the connection string in `backend/.env`

**Option B: Local MongoDB**
1. Install MongoDB Community Server
2. Start mongod service
3. Use: `mongodb://localhost:27017/mc-sons-ecommerce`

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Configure Environment Variables

Edit `backend/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRE=7d
```

### Step 4: Start the Backend

```bash
cd backend
npm start
```
Backend runs on: http://localhost:5000

The server will automatically:
- Connect to MongoDB
- Create the admin account (if not exists)
- Seed sample products

### Step 5: Start the Frontend

```bash
cd frontend
npm run dev
```
App runs on: http://localhost:3000

---

## Demo Credentials

### Admin Account
- **Email**: admin@mcsons.com
- **Password**: admin123
- **URL**: http://localhost:3000/admin

### User Account
Register a new account at http://localhost:3000/register

---

## Project Structure

```
MC-gpt/
├── backend/                  # Express.js API
│   ├── config/              # Database config
│   ├── controllers/         # Business logic
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── middleware/         # Auth, Admin, Error
│   ├── server.js           # Entry point
│   └── .env                # Environment variables
│
├── frontend/                # Next.js 14 App
│   ├── app/                # App Router pages
│   │   ├── page.js         # Home
│   │   ├── shop/           # Shop page
│   │   ├── product/[id]/   # Product details
│   │   ├── cart/           # Shopping cart
│   │   ├── checkout/       # Checkout (COD)
│   │   ├── dashboard/      # User dashboard
│   │   ├── admin/          # Admin dashboard
│   │   ├── login/          # Login
│   │   ├── register/        # Register
│   │   ├── about/          # About page
│   │   └── contact/        # Contact page
│   ├── components/         # Reusable components
│   ├── context/            # React Context
│   ├── lib/                # API utilities
│   └── .env.local          # Frontend env
│
└── README.md
```

---

## Features

### User Features
- ✅ User Registration & Login
- ✅ JWT Authentication
- ✅ Browse Products by Category
- ✅ Product Search & Filters
- ✅ Product Details with Image Gallery
- ✅ Add to Cart
- ✅ Update Cart Quantity
- ✅ Remove Items from Cart
- ✅ Cash on Delivery (COD) Checkout
- ✅ Order Confirmation
- ✅ Order History Dashboard

### Admin Features
- ✅ Admin Dashboard
- ✅ Add New Products
- ✅ Edit Products
- ✅ Delete Products
- ✅ View All Orders
- ✅ Update Order Status (Processing → Shipped → Delivered)
- ✅ Sales Summary

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/remove/:productId` - Remove from cart

### Orders
-/orders` - `POST /api Create order (COD)
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get single order
- `GET /api/orders/all` - Get all orders (Admin)
- `PUT /api/orders/:id/status` - Update order status (Admin)

---

## Deployment

### Frontend → Vercel
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variable: `NEXT_PUBLIC_API_URL=your_backend_url`
4. Deploy

### Backend → Render/Railway/Heroku
1. Push code to GitHub
2. Create new Web Service
3. Add environment variables
4. Deploy

### Database → MongoDB Atlas
1. Create cluster at https://www.mongodb.com/cloud/atlas
2. Get connection string
3. Add to backend environment

---

## Payment System

Currently using COD (Cash on Delivery). The order system is modular and ready for Razorpay or other payment gateway integration in the future.

---

## Design

### Theme
Luxury, elegant, premium.

### Color Palette
- Primary: Black (#0a0a0a)
- Accent: Gold (#d4af37)
- Background: Dark (#121212)

### Typography
- Headings: Serif (Playfair Display)
- Body: Sans-serif (Inter/Poppins)

---

## License

ISC

