"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import {
  Package, ShoppingBag, Bike, Shield, Star, ArrowRight, ChevronRight,
  Zap, Clock, Users, MapPin, CheckCircle2, Sparkles, Heart
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (hydrated && accessToken) {
      router.replace("/dashboard");
    }
  }, [hydrated, accessToken, router]);

  // Show loader while hydrating — but only briefly
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  // If logged in, show loader while redirecting
  if (accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* ===== NAVBAR ===== */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-brand to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand/25">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-navy">
              Apna<span className="text-brand">Parcel</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-brand transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-brand/25 hover:shadow-brand/40 active:scale-95"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-white to-navy-50/30" />
        <div className="absolute top-20 -right-32 w-96 h-96 bg-brand/5 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-20 -left-32 w-80 h-80 bg-navy/5 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-40 left-1/4 w-64 h-64 bg-mint/5 rounded-full blur-3xl animate-float-slow" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-full px-4 py-1.5 mb-6 animate-fade-in-down">
              <Sparkles className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-brand-700">Built for Campus Life</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-navy leading-[1.1] animate-fade-in-up">
              Campus Delivery,{" "}
              <span className="relative">
                <span className="text-gradient bg-gradient-to-r from-brand via-brand-500 to-brand-600">
                  By Students
                </span>
              </span>
              <br />
              <span className="text-navy-700">For Students</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-navy-500 max-w-2xl mx-auto leading-relaxed animate-fade-in-up text-balance" style={{ animationDelay: "150ms" }}>
              Need something from town? A fellow student headed that way will pick it up and deliver it to you.
              <span className="font-semibold text-navy-700"> Fast, affordable, peer-to-peer.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <Link
                href="/auth"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-brand to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all shadow-xl shadow-brand/25 hover:shadow-2xl hover:shadow-brand/30 active:scale-95"
              >
                <ShoppingBag className="w-5 h-5" />
                Order Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/auth"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-navy hover:bg-navy-800 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all shadow-xl shadow-navy/15 hover:shadow-2xl active:scale-95"
              >
                <Bike className="w-5 h-5" />
                Become a Deliverer
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 animate-fade-in" style={{ animationDelay: "500ms" }}>
              <div className="flex items-center gap-2 text-sm text-navy-500">
                <div className="flex -space-x-2">
                  {["bg-brand", "bg-navy", "bg-mint", "bg-brand-400"].map((bg, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full ${bg} border-2 border-white flex items-center justify-center`}>
                      <span className="text-[10px] font-bold text-white">{["R", "A", "P", "S"][i]}</span>
                    </div>
                  ))}
                </div>
                <span className="font-semibold text-navy-700">100+ students</span> already delivering
              </div>
              <div className="flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="text-sm font-semibold text-navy-700 ml-1">4.9</span>
                <span className="text-sm text-navy-500">avg rating</span>
              </div>
            </div>
          </div>

          {/* Hero visual — floating cards */}
          <div className="relative mt-16 md:mt-20 max-w-3xl mx-auto">
            <div className="relative bg-gradient-to-br from-navy to-navy-800 rounded-3xl p-1 shadow-2xl shadow-navy/20">
              <div className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-[22px] p-6 sm:p-8">
                {/* Mock order card */}
                <div className="bg-white rounded-2xl p-5 shadow-xl animate-fade-in-up">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-brand" />
                      </div>
                      <div>
                        <p className="font-bold text-navy">Notebook & Pens</p>
                        <p className="text-xs text-gray-500">From Negi Stationery • 2 min ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-xs font-bold text-green-700">Live</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-gray-500 font-medium">Item Cost</p>
                      <p className="text-lg font-bold text-navy">₹120</p>
                    </div>
                    <div className="bg-brand-50 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-gray-500 font-medium">Delivery Fee</p>
                      <p className="text-lg font-bold text-brand">₹25</p>
                    </div>
                    <div className="bg-mint-50 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-gray-500 font-medium">ETA</p>
                      <p className="text-lg font-bold text-mint">~30m</p>
                    </div>
                  </div>
                </div>

                {/* Floating notification cards */}
                <div className="absolute -right-4 sm:-right-12 top-8 bg-white rounded-xl p-3 shadow-xl animate-float border border-gray-100 hidden sm:flex items-center gap-2.5 max-w-[200px]">
                  <div className="w-8 h-8 bg-mint-100 rounded-lg flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-mint" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-navy">Order Delivered!</p>
                    <p className="text-[10px] text-gray-500">Rahul delivered your item</p>
                  </div>
                </div>

                <div className="absolute -left-4 sm:-left-10 bottom-12 bg-white rounded-xl p-3 shadow-xl animate-float-delayed border border-gray-100 hidden sm:flex items-center gap-2.5 max-w-[210px]">
                  <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                    <Bike className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-navy">Rider nearby!</p>
                    <p className="text-[10px] text-gray-500">Priya is 5 mins from shop</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 md:py-28 bg-gray-50/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-navy-50 border border-navy-100 rounded-full px-4 py-1.5 mb-4">
              <Zap className="w-4 h-4 text-navy" />
              <span className="text-sm font-semibold text-navy-700">Simple & Fast</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy tracking-tight">
              How it Works
            </h2>
            <p className="text-navy-500 mt-4 text-lg max-w-xl mx-auto">
              Three simple steps to get anything delivered from town to your hostel
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                icon: ShoppingBag,
                color: "brand",
                title: "Place Your Order",
                desc: "Tell us what you need — stationery, food, medicines, or anything from local shops. Set your budget & tip.",
                gradient: "from-brand to-brand-600",
                bg: "bg-brand-50",
                glow: "shadow-brand/10",
              },
              {
                step: "02",
                icon: Users,
                color: "navy",
                title: "A Fellow Student Picks It Up",
                desc: "Someone already headed to town sees your order, accepts it, and picks up your item from the shop.",
                gradient: "from-navy to-navy-700",
                bg: "bg-navy-50",
                glow: "shadow-navy/10",
              },
              {
                step: "03",
                icon: CheckCircle2,
                color: "mint",
                title: "Get It Delivered",
                desc: "Track your rider in real-time on the map. Verify with OTP, pay securely, and rate your experience.",
                gradient: "from-mint to-mint-600",
                bg: "bg-mint-50",
                glow: "shadow-mint/10",
              },
            ].map((item, i) => (
              <div key={i} className="group relative">
                <div className={`bg-white rounded-3xl p-8 border border-gray-100 shadow-lg ${item.glow} hover:shadow-xl transition-all duration-500 hover:-translate-y-1 h-full`}>
                  {/* Step number */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className={`w-7 h-7 text-${item.color}`} />
                    </div>
                    <span className="text-5xl font-black text-gray-100 group-hover:text-gray-200 transition-colors font-display">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3">{item.title}</h3>
                  <p className="text-navy-500 leading-relaxed">{item.desc}</p>
                </div>
                {/* Connector line (hidden on last) */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-gray-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES / WHY US ===== */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute -right-40 top-0 w-80 h-80 bg-brand/5 rounded-full blur-3xl" />
        <div className="absolute -left-40 bottom-0 w-80 h-80 bg-navy/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy tracking-tight">
              Why Students <span className="text-gradient">Love</span> ApnaParcel
            </h2>
            <p className="text-navy-500 mt-4 text-lg max-w-xl mx-auto">
              Built with campus life in mind — every feature designed for students
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Average delivery within 30 minutes from nearby shops", color: "text-amber-500", bg: "bg-amber-50" },
              { icon: Shield, title: "Trust System", desc: "4-level trust badges ensure reliable deliverers every time", color: "text-blue-500", bg: "bg-blue-50" },
              { icon: MapPin, title: "Live Tracking", desc: "Watch your rider on a real-time map from pickup to doorstep", color: "text-brand", bg: "bg-brand-50" },
              { icon: Heart, title: "Community First", desc: "Help your peers earn while you get your essentials delivered", color: "text-rose-500", bg: "bg-rose-50" },
              { icon: Clock, title: "OTP Verified", desc: "Secure delivery confirmation with one-time password verification", color: "text-mint", bg: "bg-mint-50" },
              { icon: Star, title: "Rate & Review", desc: "Transparent rating system keeps the quality high for everyone", color: "text-purple-500", bg: "bg-purple-50" },
            ].map((feat, i) => (
              <div
                key={i}
                className="group bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`w-12 h-12 ${feat.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feat.icon className={`w-6 h-6 ${feat.color}`} />
                </div>
                <h3 className="font-bold text-navy text-lg mb-2">{feat.title}</h3>
                <p className="text-navy-500 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DUAL CTA SECTION ===== */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Order Card */}
            <div className="relative bg-gradient-to-br from-brand to-brand-700 rounded-3xl p-8 md:p-10 text-white overflow-hidden group">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute -right-6 -bottom-16 w-64 h-64 bg-white/5 rounded-full" />
              <div className="relative">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold mb-3">Need Something?</h3>
                <p className="text-white/80 mb-8 leading-relaxed max-w-sm">
                  Place an order for anything from local shops. A fellow student will pick it up and deliver it to your hostel.
                </p>
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 bg-white text-brand font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-all active:scale-95 shadow-lg"
                >
                  Place Your First Order <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Rider Card */}
            <div className="relative bg-gradient-to-br from-navy to-navy-900 rounded-3xl p-8 md:p-10 text-white overflow-hidden group">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute -right-6 -bottom-16 w-64 h-64 bg-white/5 rounded-full" />
              <div className="relative">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <Bike className="w-7 h-7" />
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold mb-3">Heading to Town?</h3>
                <p className="text-white/80 mb-8 leading-relaxed max-w-sm">
                  Pick up orders along the way and earn delivery fees + tips. Turn your daily commute into pocket money.
                </p>
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 bg-white text-navy font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-all active:scale-95 shadow-lg"
                >
                  Start Earning Today <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-gray-100 bg-gray-50/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-600 rounded-xl flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-navy">
                Apna<span className="text-brand">Parcel</span>
              </span>
            </div>
            <p className="text-sm text-navy-500">
              Made with <Heart className="w-3.5 h-3.5 inline text-red-500 fill-red-500" /> by students, for students — Dwarahat, Uttarakhand
            </p>
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} ApnaParcel</p>
          </div>
        </div>
      </footer>
    </div>
  );
}