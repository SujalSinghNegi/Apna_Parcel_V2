"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  Package, ShoppingBag, Bike, Shield, Star, ArrowRight, ChevronRight,
  Zap, Clock, Users, MapPin, CheckCircle2, Sparkles, Heart
} from "lucide-react";

import { HeroSection } from "@/components/layout/HeroSection";
import { Navbar } from "@/components/layout/LandingNavbar";

// --- Animation Variants ---
const staggerContainer:Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const fadeUp:Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(5px)" },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)", 
    transition: { type: "spring", stiffness: 100, damping: 20 } 
  },
};

const scaleIn : Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } },
};

const floatAnimation = (delay = 0) => ({
  y: [0, -15, 0],
  transition: {
    duration: 5,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut",
    delay,
  },
});

export default function LandingPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state: any) => state.accessToken);
  const [hydrated, setHydrated] = useState(false);
console.log(accessToken);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (hydrated && accessToken) {
      router.replace("/dashboard");
    }
  }, [hydrated, accessToken, router]);

  // Show loader while hydrating
  if (!hydrated || accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-brand-200 border-t-brand rounded-full" 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden selection:bg-brand-200 selection:text-brand-900">
    <Navbar/>
    <HeroSection/>
    </div>
  );
}