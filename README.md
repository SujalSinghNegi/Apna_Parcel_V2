# 📦 Apna Parcel — P2P Campus Delivery Network (v2 Serverless)

> **HackRush 2026 Winner (Rank 2)** 🏆
> Migrated from a Node.js/Express Hackathon MVP to a fully Serverless Production Architecture.

Apna Parcel is a hyper-local, peer-to-peer delivery platform designed for university campuses. It crowdsources delivery by connecting students who need items with peers (riders) who are already heading in that direction.

---

## 🏗️ Architecture: The Serverless Migration

For the production release, we migrated the backend from Node.js/WebSockets to **Firebase & Stripe**.

- **Real-Time Sync:** Replaced `Socket.io` with **Firestore `onSnapshot`** for sub-second, zero-latency live tracking and chat, eliminating socket connection drops.
- **Trustless Escrow:** Integrated **Stripe** to hold funds in a compliant Nodal Account during transit.
- **Security:** Shifted critical logic (Payouts, OTP verification) to **Firebase Cloud Functions** to prevent client-side manipulation.

---

## ✨ Core Features

- **Live Radar:** Riders see a real-time, pulsing map of all `PENDING` orders nearby.
- **Secure Escrow Payments:** Clients pay upfront via Stripe (Authorization Hold). Funds are only captured and routed to the Rider when the 4-digit Delivery OTP is verified.
- **In-App Chat & Photo Verification:** Real-time chat and receipt photo uploads via Firebase Storage to prevent disputes.
- **Dynamic Pricing Engine:** Calculates delivery fees based on distance, weight, and urgency.

---

## 🚀 Local Development Setup

Follow these steps to run the project locally on your machine.

### 1. Prerequisites

- Node.js 18+ installed
- A Firebase Project (with Firestore, Authentication, and Storage enabled)
- A Stripe Developer Account

### 2. Clone and Install

```powershell
git clone https://github.com/your-username/apna-parcel-v2.git
cd apna-parcel-v2
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory and add your keys:

```env
# --- FIREBASE CLIENT CONFIG ---
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# --- STRIPE CONFIG ---
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx...
```

### 4. Run the Development Server

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💳 Testing the Escrow System (Stripe)

While testing locally in Stripe Test Mode, use these card numbers in the payment modal:

| Card Type       | Card Number              | Expiry          | CVC | Expected Result              |
|-----------------|--------------------------|-----------------|-----|------------------------------|
| Visa            | `4242 4242 4242 4242`    | Any future date | 123 | Success (Auth Hold applied)  |
| Visa (Decline)  | `4000 0000 0000 0002`    | Any future date | 123 | Declined                     |
| Visa (Auth)     | `4000 0025 0000 3155`    | Any future date | 123 | Requires Authentication      |

---

## 📱 Core Routes

| Route           | Description                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| `/auth`         | Firebase Authentication & Profile Onboarding                                |
| `/dashboard`    | Client Hub: Active tracking, quick actions, stats                           |
| `/orders/new`   | Place a new delivery request                                                |
| `/orders`       | Order History (Infinite scroll via Firestore)                               |
| `/orders/[id]`  | Live Action Room: Order timeline, chat, photo viewer, and OTP entry         |
| `/rider`        | Rider Hub: Live feed of available campus orders                             |
| `/profile`      | Manage user stats, earnings, and avatars                                    |

---

## ☁️ Production Deployment (Vercel)

This project is optimized for deployment on Vercel.

1. Push your code to GitHub.
2. Import the repository into Vercel.
3. Paste all environment variables from `.env.local` into the Vercel Environment Variables settings.
4. Click **Deploy**.

> **Note on TypeScript Strictness:** If Vercel blocks deployment due to missing types during the transition from Node to Firebase, ensure the bypass flags (`ignoreBuildErrors: true`) are active in `next.config.js` or `next.config.mjs`.

---

## 🔒 Production Security Checklist (For Contributors)

Before scaling to thousands of campus users, the following Firebase Cloud Functions and Security Rules must be configured:

### 1. Firestore Security Rules

- **Orders:** `allow read, write: if request.auth.uid == resource.data.clientId || request.auth.uid == resource.data.riderId;`
- **Users:** Users can only modify their own documents.

### 2. Firebase Cloud Functions (Node.js)

Frontend code should not update critical payment statuses. The following functions handle sensitive operations:

- **`verifyOTP(orderId, code)`** — Verifies the delivery code and triggers Stripe Capture to pay the rider.
- **`acceptOrder(orderId, riderId)`** — Ensures no two riders can accept the same order simultaneously (Transaction lock).

### 3. Storage Rules

- Receipts and chat photos in `/orders/{orderId}/` can only be viewed by the `clientId` and `riderId` attached to that specific order.

---

Built with ❤️ for campus communities.
