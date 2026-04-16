"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Package } from "lucide-react";

import { Navbar } from "@/components/layout/LandingNavbar";
import { HeroSection } from "@/components/layout/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Stats } from "@/components/landing/Stats";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

// --- Splash Screen Component ---
const SplashScreen = () => {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-slate-950 overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }} 
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand/20 dark:bg-brand/10 rounded-full blur-[100px]" 
      />

      {/* Animated Logo */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          className="w-20 h-20 bg-gradient-to-br from-brand via-brand-500 to-mint rounded-3xl flex items-center justify-center shadow-2xl shadow-brand/30"
        >
          <Package className="w-10 h-10 text-white" />
        </motion.div>

        <motion.div className="text-center overflow-hidden">
          <motion.h1 
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.4 }}
            className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight"
          >
            Apna<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint">Parcel</span>
          </motion.h1>
        </motion.div>

        {/* Sleek Progress Line */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-48 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-4"
        >
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="h-full w-full bg-gradient-to-r from-brand to-mint rounded-full"
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default function LandingPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state: any) => state.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  // 1. Wait for Zustand persist to rehydrate from localStorage
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return () => unsub();
  }, []);

  // 2. Minimum splash screen duration (so the cool animation actually plays)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashFinished(true);
    }, 2200); // 2.2 seconds allows the progress bar to finish
    return () => clearTimeout(timer);
  }, []);

  // 3. If already logged in, redirect based on role
  const user = useAuthStore((state: any) => state.user);
  useEffect(() => {
    if (hydrated && accessToken && user) {
      router.replace(user.isAdmin ? "/admin" : user.role === "VENDOR" ? "/vendors/dashboard" : "/dashboard");
    }
  }, [hydrated, accessToken, user, router]);

  // Determine if we should show the splash screen
  // Show it if: We haven't hydrated yet OR the artificial timer isn't done OR we are redirecting
  const showSplash = !hydrated || !splashFinished || accessToken;

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>

      {/* Render main content underneath. It becomes visible once Splash unmounts */}
      {!showSplash && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden selection:bg-brand-200 selection:text-brand-900"
        >
          <Navbar />
          <HeroSection />
          <HowItWorks />
          <Features />
          <Stats />
          <CTA />
          <Footer />
        </motion.div>
      )}
    </>
  );
}