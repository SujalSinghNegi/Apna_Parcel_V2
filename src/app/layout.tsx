import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "ApnaParcel — Apni Zaroorat, Apno Ka Kartavya",
  description: "Peer-to-peer community delivery for Dwarahat, Uttarakhand",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" toastOptions={{
          className: "rounded-xl shadow-lg text-sm",
          success: { iconTheme: { primary: "#FF6B35", secondary: "white" } },
        }} />
      </body>
    </html>
  );
}
