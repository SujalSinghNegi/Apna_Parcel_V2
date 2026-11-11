# 📦 Apna Parcel — P2P Campus Delivery Network (v2 Serverless)

> **HackRush 2026 Winner (Rank 2)** 🏆
> Migrated from a Node.js/Express Hackathon MVP to a fully Serverless Production Architecture.

Apna Parcel is a hyper-local, peer-to-peer delivery platform designed for university campuses. It crowdsources delivery by connecting students who need items with peers (riders) who are already heading in that direction.

---

## 🏗️ Architecture: The Serverless Migration

The current showcase version is being migrated from the original Node.js/WebSockets backend to **Firebase**. Razorpay test mode is planned for the payment workflow; payment capture and verification are not implemented yet.

- **Real-Time Sync:** Replaced `Socket.io` with **Firestore `onSnapshot`** for sub-second, zero-latency live tracking and chat, eliminating socket connection drops.
- **Trustworthy payments:** Payment creation and webhook verification will run in trusted Firebase server code.
- **Security:** Critical logic such as rider acceptance, payment verification, and OTP verification will move to Firebase Cloud Functions.

---

## ✨ Core Features

- **Live Radar:** Riders see a real-time, pulsing map of all `PENDING` orders nearby.
- **Secure payments:** Clients will pay through Razorpay test mode, with server-side verification before an order is marked paid.
- **In-App Chat & Photo Verification:** Real-time chat and receipt photo uploads via Firebase Storage to prevent disputes.
- **Dynamic Pricing Engine:** Calculates delivery fees based on distance, weight, and urgency.

---

## 🚀 Local Development Setup

Follow these steps to run the project locally on your machine.

### 1. Prerequisites

- Node.js 18+ installed
- A Firebase Project (with Firestore, Authentication, and Storage enabled)
- A Razorpay test account will be required when the payment milestone begins.

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

# --- RAZORPAY CONFIG (added during payment milestone) ---
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_test_key_id
```

### 4. Run the Development Server

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Firebase locally (emulator-first workflow)

The emulator workflow keeps authentication, Firestore, and Storage changes away
from the shared Firebase project.

1. Install the Firebase CLI if it is not already installed:

   ```powershell
   npm install -g firebase-tools
   firebase login
   ```

2. Copy `.env.example` to `.env.local` and set the Firebase client values.
3. Set this flag in `.env.local`:

   ```env
   NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
   ```

4. In one terminal, start the complete emulator stack:

   ```powershell
   npm run firebase:emulators
   ```

5. In a second terminal, start Next.js:

   ```powershell
   npm run dev
   ```

Open the Emulator UI at [http://127.0.0.1:4000](http://127.0.0.1:4000).
The local endpoints are Auth `9099`, Firestore `8080`, Storage `9199`, and
Functions `5001`. The Functions build runs automatically before startup.
To persist emulator data between runs, use `npm run firebase:emulators:data`.

When testing the deployed or shared Firebase project, set
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false` and restart Next.js. Never commit
`.env.local` or emulator export data.

Local emulator data and the deployed Vercel/Firebase data are separate
databases. An order created locally is visible only to local browser sessions
connected to the same emulator process. An order created on Vercel is visible
only through the deployed Firebase project.

---

## 💳 Payment status

The current payment UI is still a placeholder. Razorpay test-mode integration will be added after the customer, rider, vendor, chat, and upload flows are stable.

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

> **TypeScript strictness:** Production builds run TypeScript validation. Do not bypass type errors; fix the underlying type or data-contract issue.

---

## 🔒 Production Security Checklist (For Contributors)

Before scaling to thousands of campus users, the following Firebase Cloud Functions and Security Rules must be configured:

### 1. Firestore Security Rules

- **Orders:** `allow read, write: if request.auth.uid == resource.data.clientId || request.auth.uid == resource.data.riderId;`
- **Users:** Users can only modify their own documents.

### 2. Firebase Cloud Functions (Node.js)

Frontend code should not update critical payment statuses. The following functions handle sensitive operations:

- **`verifyOTP(orderId, code)`** — Will verify the delivery code in trusted server code before completing the order.
- **`acceptOrder(orderId, riderId)`** — Ensures no two riders can accept the same order simultaneously (Transaction lock).

### 3. Storage Rules

- Receipts and chat photos in `/orders/{orderId}/` can only be viewed by the `clientId` and `riderId` attached to that specific order.

---

Built with ❤️ for campus communities.
