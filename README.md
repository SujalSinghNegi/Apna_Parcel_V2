# 📦 ApnaParcel Frontend

> Next.js 14 + Tailwind CSS + TypeScript frontend for ApnaParcel

---

## 🚀 Quick Start (Windows PowerShell)

```powershell
cd apnaparcel-frontend
.\scripts\setup.ps1
```

Or manually:

```powershell
npm install
copy .env.local.example .env.local
# Fill in .env.local
npm run dev
# Opens at http://localhost:3001
```

---

## ⚙️ Environment Setup

Open `.env.local` and set:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
```

Make sure the backend is running on port 3000 first.

---

## 📱 Pages & Routes

| Route | Description |
|---|---|
| `/auth` | OTP login + registration (3-step flow) |
| `/dashboard` | Home — stats, quick actions, recent orders |
| `/orders/new` | Place a new order with fee calculator |
| `/orders` | My orders list (client or rider view) |
| `/orders/:id` | Order detail — actions, chat, OTP, photo |
| `/rider` | Rider mode — browse & accept available orders |
| `/profile` | Profile, stats, edit, photo upload |
| `/notifications` | All notifications |
| `/complaints` | My complaints list |
| `/complaints/new` | Raise a complaint with evidence upload |
| `/ratings/:orderId` | Rate after delivery (3-criteria) |
| `/vendors` | Browse shops + register a shop |
| `/admin` | Admin dashboard (admin only) |
| `/admin/users` | Manage users — strike, ban, view detail |
| `/admin/orders` | All platform orders + manual refund |
| `/admin/complaints` | Resolve/dismiss complaints |
| `/admin/vendors` | Approve/reject vendor registrations |

---

## 🔌 Real-Time Features

Socket.io is initialized after login. Events handled:

- **Live order status updates** — status changes broadcast to order room
- **Real-time chat** — messages delivered instantly, photo support
- **Rider GPS tracking** — live location updated every 5s during active delivery
- **Push notifications** — toasted and shown in notification bell

---

## 💳 Stripe Test Mode

Use these cards in the payment flow:
- `4242 4242 4242 4242` — Success
- `4000 0000 0000 0002` — Declined
- `4000 0025 0000 3155` — Requires authentication

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary color | `#FF6B35` (brand orange) |
| Navy | `#1E3A5F` |
| Font (body) | DM Sans |
| Font (headings) | Sora |
| Border radius | `xl` (12px), `2xl` (16px), `3xl` (24px) |

---

*ApnaParcel v1.0 · Built for Hackathon 2024*
