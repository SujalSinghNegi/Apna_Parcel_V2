import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AuthProvider } from "@/components/layout/AuthProvider";

export const metadata: Metadata = {
  title: "ApnaParcel — Apni Zaroorat, Apno Ka Kartavya",
  description: "Peer-to-peer community delivery for Dwarahat, Uttarakhand",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster position="top-right" toastOptions={{
            className: "!rounded-xl !shadow-lg !text-sm !bg-white dark:!bg-gray-800 dark:!text-gray-100",
            success: { iconTheme: { primary: "#FF6B35", secondary: "white" } },
          }} />
        </ThemeProvider>
      </body>
    </html>
  );
}