"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { api, getErrorMessage } from "@/lib/api";
import { initSocket } from "@/lib/socket";
import toast from "react-hot-toast";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Package, Mail, Lock, User as UserIcon, ChevronRight, 
  ArrowLeft, Sparkles, GraduationCap, MapPin, Briefcase, Store 
} from "lucide-react";

type Step = "email" | "otp" | "register";

// --- Framer Motion Variants ---
const pageVariants:Variants = {
  initial: { opacity: 0, x: 20, filter: "blur(5px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 25 } },
  exit: { opacity: 0, x: -20, filter: "blur(5px)", transition: { duration: 0.2 } }
};

const staggerContainer:Variants = {
  animate: { transition: { staggerChildren: 0.05 } }
};

const itemVariants:Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
};

export default function AuthPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore() as any;
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState("STUDENT");
  const [collegeName, setCollegeName] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("1ST");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post("/auth/send-otp", { email });
      toast.success("OTP sent to your email!");
      setStep("otp");
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { email, otp });
      if (data.data.requiresRegistration) {
        setStep("register");
      } else {
        const { accessToken, refreshToken, user } = data.data;
        setAuth(user, accessToken, refreshToken);
        initSocket(accessToken);
        toast.success("Welcome back, " + user.name + "!");
        router.push(user.isAdmin ? "/admin" : user.role === "VENDOR" ? "/vendors/dashboard" : "/dashboard");
      }
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); }
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error("Enter your name"); return; }
    setLoading(true);
    try {
      const payload: any = { email, otp, name, phone, userType };
      if (userType === "STUDENT") { payload.collegeName = collegeName; payload.yearOfStudy = yearOfStudy; payload.branch = branch; }
      const { data } = await api.post("/auth/register", payload);
      const { accessToken, refreshToken, user } = data.data;
      setAuth(user, accessToken, refreshToken);
      initSocket(accessToken);
      toast.success("Welcome to ApnaParcel, " + user.name + "!");
      router.push(user.isAdmin ? "/admin" : user.role === "VENDOR" ? "/vendors/dashboard" : "/dashboard");
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); }
  };

  const userTypeOptions = [
    { value: "STUDENT", label: "College Student", icon: GraduationCap },
    { value: "LOCAL_PERSON", label: "Local Resident", icon: MapPin },
    { value: "STAFF_FACULTY", label: "Staff / Faculty", icon: Briefcase },
  ];

  const stepIndex = step === "email" ? 0 : step === "otp" ? 1 : 2;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-950 overflow-hidden selection:bg-brand-200 selection:text-brand-900">
      {/* Ambient Background Engine */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-white to-navy-50/30 dark:from-brand-950/20 dark:via-slate-950 dark:to-navy-950/20" />
        <motion.div 
          animate={{ y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-brand/10 dark:bg-brand/20 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ y: [0, 40, 0], opacity: [0.2, 0.5, 0.2] }} 
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-mint/10 dark:bg-mint/20 rounded-full blur-[100px]" 
        />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Logo Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Link href="/" className="flex flex-col items-center justify-center gap-3 mb-8 group">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 bg-gradient-to-br from-brand to-brand-500 rounded-2xl flex items-center justify-center shadow-xl shadow-brand/30"
            >
              <Package className="w-8 h-8 text-white" />
            </motion.div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
                Apna<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-500">Parcel</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-1">Campus Delivery Network</p>
            </div>
          </Link>
        </motion.div>

        {/* Auth Card (Glassmorphic) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] border border-white/50 dark:border-slate-700/50 overflow-hidden"
        >
          {/* Progress Indicator */}
          <div className="px-8 pt-8 pb-4">
            <div className="flex items-center gap-2">
              {["Account", "Verify", "Profile"].map((label, i) => (
                <div key={label} className="flex-1 relative">
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand"
                      initial={{ width: "0%" }}
                      animate={{ width: i <= stepIndex ? "100%" : "0%" }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                  </div>
                  <motion.p 
                    animate={{ color: i <= stepIndex ? "#3b82f6" : "#94a3b8" }} // brand color vs slate-400
                    className="text-[10px] mt-2 font-bold uppercase tracking-wider text-center"
                  >
                    {label}
                  </motion.p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-8 pb-8 pt-2">
            {/* Step Content with AnimatePresence for smooth swapping */}
            <AnimatePresence mode="wait">
              {step === "email" && (
                <motion.form key="email" variants={pageVariants} initial="initial" animate="animate" exit="exit" onSubmit={sendOtp} className="space-y-6">
                  <motion.div variants={staggerContainer}>
                    <motion.h2 variants={itemVariants} className="text-2xl font-extrabold text-slate-900 dark:text-white">Welcome back! 👋</motion.h2>
                    <motion.p variants={itemVariants} className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">Enter your email to receive a secure code.</motion.p>
                  </motion.div>
                  <motion.div variants={itemVariants} className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@college.edu"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-900 dark:text-white font-semibold placeholder:text-slate-400 placeholder:font-medium" required />
                    </div>
                  </motion.div>
                  <motion.button variants={itemVariants} type="submit" disabled={loading}
                    className="w-full relative group overflow-hidden bg-brand hover:bg-brand-600 text-white font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand/25 hover:shadow-brand/40 active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><span className="relative z-10">Continue</span> <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {step === "otp" && (
                <motion.form key="otp" variants={pageVariants} initial="initial" animate="animate" exit="exit" onSubmit={verifyOtp} className="space-y-6">
                  <motion.div variants={staggerContainer}>
                    <button type="button" onClick={() => setStep("email")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-4 font-bold transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <motion.h2 variants={itemVariants} className="text-2xl font-extrabold text-slate-900 dark:text-white">Check your inbox 📧</motion.h2>
                    <motion.p variants={itemVariants} className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 leading-relaxed">
                      We sent a 6-digit code to <br/>
                      <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block mt-1">{email}</span>
                    </motion.p>
                  </motion.div>
                  <motion.div variants={itemVariants} className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Verification Code</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                      <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, "").slice(0, 6))}
                        placeholder="• • • • • •" maxLength={6}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-2xl tracking-[0.4em] font-mono text-center font-bold text-slate-900 dark:text-white placeholder:tracking-[0.5em] placeholder:text-slate-300 dark:placeholder:text-slate-600" required />
                    </div>
                  </motion.div>
                  <motion.button variants={itemVariants} type="submit" disabled={loading || otp.length !== 6}
                    className="w-full bg-brand hover:bg-brand-600 text-white font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand/25 active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>Verify & Continue <ChevronRight className="w-5 h-5" /></>
                    )}
                  </motion.button>
                  <motion.button variants={itemVariants} type="button" onClick={sendOtp} className="w-full text-sm text-slate-500 hover:text-brand font-bold transition-colors py-1">
                    Didn&apos;t get it? Resend OTP
                  </motion.button>
                </motion.form>
              )}

              {step === "register" && (
                <motion.form key="register" variants={pageVariants} initial="initial" animate="animate" exit="exit" onSubmit={register} className="space-y-5">
                  <motion.div variants={staggerContainer}>
                    <button type="button" onClick={() => setStep("otp")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2 font-bold transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <motion.h2 variants={itemVariants} className="text-2xl font-extrabold text-slate-900 dark:text-white">Almost there! ✨</motion.h2>
                    <motion.p variants={itemVariants} className="text-slate-500 dark:text-slate-400 text-sm mt-1">Tell us a bit about yourself</motion.p>
                  </motion.div>

                  <motion.div variants={staggerContainer} className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?"
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-900 dark:text-white font-semibold placeholder:text-slate-400" required />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Phone <span className="text-slate-400 font-medium">(optional)</span></label>
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" maxLength={10}
                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-900 dark:text-white font-semibold placeholder:text-slate-400" />
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">I am a...</label>
                      <div className="grid grid-cols-3 gap-2">
                        {userTypeOptions.map(opt => (
                          <motion.button whileTap={{ scale: 0.95 }} key={opt.value} type="button" onClick={() => setUserType(opt.value)}
                            className={`p-3 rounded-2xl border-2 text-center transition-all ${
                              userType === opt.value
                                ? "border-brand bg-brand/5 dark:bg-brand/20 ring-2 ring-brand/20"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-transparent"
                            }`}
                          >
                            <opt.icon className={`w-5 h-5 mx-auto mb-1.5 transition-colors ${userType === opt.value ? "text-brand" : "text-slate-400"}`} />
                            <p className={`text-[11px] font-bold transition-colors ${userType === opt.value ? "text-brand dark:text-brand-400" : "text-slate-600 dark:text-slate-400"}`}>{opt.label}</p>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {userType === "STUDENT" && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: "auto" }} 
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 p-4 bg-brand/5 dark:bg-brand/10 rounded-2xl border border-brand/20 overflow-hidden"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <GraduationCap className="w-4 h-4 text-brand" />
                            <span className="text-xs font-bold text-brand">Student Details</span>
                          </div>
                          <input value={collegeName} onChange={e => setCollegeName(e.target.value)} placeholder="College name"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm font-semibold text-slate-900 dark:text-white transition-all" />
                          <div className="flex gap-2">
                            <select value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}
                              className="flex-1 px-3 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand text-sm font-semibold text-slate-900 dark:text-white">
                              {["1ST","2ND","3RD","4TH"].map(y => <option key={y} value={y}>{y} Year</option>)}
                            </select>
                            <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="Branch/Dept"
                              className="flex-1 px-3 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand text-sm font-semibold text-slate-900 dark:text-white transition-all" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <motion.button variants={itemVariants} type="submit" disabled={loading}
                    className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 dark:shadow-white/10 active:scale-[0.98] mt-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Create My Account</>
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Footer inside card */}
          <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700/50 text-center backdrop-blur-md space-y-2">
            <Link href="/vendor-login" className="flex items-center justify-center gap-2 text-xs font-bold text-brand hover:text-brand-600 transition-colors">
              <Store className="w-3.5 h-3.5" /> Own a shop? Login or Register →
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex justify-center items-center gap-1.5">
              🏔️ Serving the campus community of Dwarahat
            </p>
          </div>
        </motion.div>

        {/* Back to home */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6"
        >
          <Link href="/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand font-bold transition-colors">
            ← Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}