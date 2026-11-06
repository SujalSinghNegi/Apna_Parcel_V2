"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { auth, db } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  ConfirmationResult,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { normalizeAuthUser } from "@/lib/auth-profile";
import toast from "react-hot-toast";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Package, Mail, Lock, User as UserIcon, ChevronRight,
  ArrowLeft, Sparkles, GraduationCap, MapPin, Briefcase, Store,
  Smartphone, Link2, ShieldCheck
} from "lucide-react";

type Step = "credentials" | "register";

// --- Framer Motion Variants ---
const pageVariants: Variants = {
  initial: { opacity: 0, x: 20, filter: "blur(5px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 25 } },
  exit: { opacity: 0, x: -20, filter: "blur(5px)", transition: { duration: 0.2 } }
};

const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.05 } }
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
};

export default function AuthPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<Step>("credentials");
  const [isLogin, setIsLogin] = useState(true);
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState("STUDENT");
  const [collegeName, setCollegeName] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("1ST");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "phone" | "emailLink">("password");
  const [countryCode, setCountryCode] = useState("+91");
  const [customCountryCode, setCustomCountryCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const finishProviderSignIn = useCallback(async (firebaseUser: {
    uid: string;
    email: string | null;
    phoneNumber: string | null;
    displayName: string | null;
  }) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const existingProfile = await getDoc(userRef);
    let profile = existingProfile.exists() ? existingProfile.data() : null;

    if (!profile) {
      profile = {
        uid: firebaseUser.uid,
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || firebaseUser.phoneNumber || "User",
        phone: firebaseUser.phoneNumber || "",
        userType: "STUDENT",
        role: "CLIENT",
        trustLevel: 1,
        deliveriesCompleted: 0,
        rating: 0,
        createdAt: serverTimestamp(),
      };
      await setDoc(userRef, profile);
    }

    const userData = normalizeAuthUser(firebaseUser.uid, profile);
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Authentication session could not be established.");

    setAuth(userData, token, null);
    toast.success(`Welcome, ${userData.name}!`);
    router.push(userData.isAdmin ? "/admin" : userData.role === "VENDOR" ? "/vendors/dashboard" : "/dashboard");
  }, [router, setAuth]);

  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    const storedEmail = window.localStorage.getItem("apnaparcel-email-link");
    const emailForSignIn = storedEmail || window.prompt("Confirm your email address");
    if (!emailForSignIn) return;

    setLoading(true);
    signInWithEmailLink(auth, emailForSignIn, window.location.href)
      .then(({ user }) => finishProviderSignIn(user))
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Email link sign-in failed."))
      .finally(() => {
        window.localStorage.removeItem("apnaparcel-email-link");
        setLoading(false);
      });
  }, [finishProviderSignIn]);

  useEffect(() => () => {
    recaptchaRef.current?.clear();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      await finishProviderSignIn(user);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLink = async () => {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }

    setLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: `${window.location.origin}/auth`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem("apnaparcel-email-link", email);
      toast.success("Sign-in link sent. Check your email.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not send sign-in link.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneCode = async () => {
    if (!phoneCode || !phoneConfirmation) {
      toast.error("Enter the verification code.");
      return;
    }

    setLoading(true);
    try {
      const { user } = await phoneConfirmation.confirm(phoneCode);
      await finishProviderSignIn(user);
      setPhoneConfirmation(null);
      setPhoneCode("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Phone verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async () => {
    const normalizedPhone = phone.replace(/\D/g, "");
    const normalizedCountryCode = countryCode === "custom"
      ? `+${customCountryCode.replace(/\D/g, "")}`
      : countryCode;
    if (countryCode === "custom" && normalizedCountryCode.length < 2) {
      toast.error("Enter a valid country code, for example +91.");
      return;
    }
    if (!normalizedPhone) {
      toast.error("Enter a phone number with country code.");
      return;
    }

    setLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, "phone-recaptcha", {
          size: "invisible",
        });
      }
      const confirmation = await signInWithPhoneNumber(auth, `${normalizedCountryCode}${normalizedPhone}`, recaptchaRef.current);
      setPhoneConfirmation(confirmation);
      toast.success("Verification code sent.");
    } catch (error: unknown) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      toast.error(error instanceof Error ? error.message : "Could not send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMethod === "phone") {
      await handlePhoneSignIn();
      return;
    }
    if (authMethod === "emailLink") {
      await handleEmailLink();
      return;
    }
    if (!email || !password) return;
    
    if (!isLogin) {
      setStep("register");
      return;
    }

    setLoading(true);
    try {
      // 1. Firebase Login
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCred.user.getIdToken(); // Grab the real token!
      
      // 2. Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
      
      if (userDoc.exists()) {
        const userData = normalizeAuthUser(userCred.user.uid, userDoc.data());
        
        // 🔥 CRITICAL FIX: Ensure BOTH id and uid are present for backwards compatibility
        // Pass the token so the app knows it's a valid session
        setAuth(userData, token, null);
        toast.success("Welcome back, " + (userData.name || "User") + "!");
        router.push(userData.isAdmin ? "/admin" : userData.role === "VENDOR" ? "/vendors/dashboard" : "/dashboard");
      } else {
        toast.error("Profile incomplete. Please register.");
        setIsLogin(false);
        setStep("register");
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast.error("Incorrect email or password.");
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error("Enter your name"); return; }
    setLoading(true);
    
    try {
      // 1. Create Authentication Account
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      const token = await userCred.user.getIdToken();

      // 2. Prepare Profile Data for Database (Added 'id' field to fix legacy crashes)
      const payload = {
        uid, 
        id: uid, 
        email, 
        name, 
        phone, 
        userType, 
        role: "CLIENT" as const,
        trustLevel: 1,
        deliveriesCompleted: 0,
        rating: 0,
        createdAt: serverTimestamp(),
      };
      
      if (userType === "STUDENT") { 
        Object.assign(payload, { collegeName, yearOfStudy, branch });
      }

      // 3. Save to Firestore Database
      await setDoc(doc(db, "users", uid), payload);
      
      // 4. Update local memory
      setAuth(normalizeAuthUser(uid, {
        ...payload,
        createdAt: new Date().toISOString(),
      }), token, null);
      toast.success("Welcome to ApnaParcel, " + name + "!");
      router.push("/dashboard");
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Email is already registered. Please login.");
        setStep("credentials");
        setIsLogin(true);
      } else {
        toast.error(error.message);
      }
    } finally { 
      setLoading(false); 
    }
  };

  const userTypeOptions = [
    { value: "STUDENT", label: "College Student", icon: GraduationCap },
    { value: "LOCAL_PERSON", label: "Local Resident", icon: MapPin },
    { value: "STAFF_FACULTY", label: "Staff / Faculty", icon: Briefcase },
  ];

  const stepIndex = step === "credentials" ? 0 : 1;

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
              {["Account", "Profile"].map((label, i) => (
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
                    animate={{ color: i <= stepIndex ? "#FF6B35" : "#94a3b8" }}
                    className="text-[10px] mt-2 font-bold uppercase tracking-wider text-center"
                  >
                    {label}
                  </motion.p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-8 pb-8 pt-2">
            <AnimatePresence mode="wait">
              {step === "credentials" && (
                <motion.form key="credentials" variants={pageVariants} initial="initial" animate="animate" exit="exit" onSubmit={handleAuth} className="space-y-5">
                  <motion.div variants={staggerContainer}>
                    <motion.h2 variants={itemVariants} className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {isLogin ? "Welcome back! 👋" : "Create an account ✨"}
                    </motion.h2>
                    <motion.p variants={itemVariants} className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
                      {isLogin ? "Enter your email and password to continue." : "Set up your credentials to get started."}
                    </motion.p>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="space-y-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Choose how to continue</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select one login method below.</p>
                    </div>
                    <div className="space-y-2">
                      <button type="button" onClick={handleGoogleSignIn} disabled={loading}
                        className="flex w-full items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 px-4 py-3 text-left transition-all hover:border-brand hover:bg-brand/5 disabled:opacity-50">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-extrabold shadow-sm">G</span>
                        <span><span className="block text-sm font-extrabold text-slate-800 dark:text-slate-200">Continue with Google</span><span className="block text-[11px] text-slate-400">Use your Google account</span></span>
                      </button>
                      <button type="button" onClick={() => setAuthMethod("phone")}
                        className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${authMethod === "phone" ? "border-brand bg-brand/5 ring-2 ring-brand/10" : "border-slate-200 dark:border-slate-700 hover:border-brand"}`}>
                        <Smartphone className={`h-5 w-5 ${authMethod === "phone" ? "text-brand" : "text-slate-400"}`} />
                        <span><span className="block text-sm font-extrabold text-slate-800 dark:text-slate-200">Continue with phone</span><span className="block text-[11px] text-slate-400">Verify with a one-time code</span></span>
                      </button>
                      <button type="button" onClick={() => setAuthMethod("password")}
                        className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${authMethod === "password" ? "border-brand bg-brand/5 ring-2 ring-brand/10" : "border-slate-200 dark:border-slate-700 hover:border-brand"}`}>
                        <Lock className={`h-5 w-5 ${authMethod === "password" ? "text-brand" : "text-slate-400"}`} />
                        <span><span className="block text-sm font-extrabold text-slate-800 dark:text-slate-200">Email &amp; password</span><span className="block text-[11px] text-slate-400">Use your registered password</span></span>
                      </button>
                      <button type="button" onClick={() => { setAuthMethod("emailLink"); setIsLogin(true) }}
                        className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${authMethod === "emailLink" ? "border-brand bg-brand/5 ring-2 ring-brand/10" : "border-slate-200 dark:border-slate-700 hover:border-brand"}`}>
                        <Link2 className={`h-5 w-5 ${authMethod === "emailLink" ? "text-brand" : "text-slate-400"}`} />
                        <span><span className="block text-sm font-extrabold text-slate-800 dark:text-slate-200">Email link</span><span className="block text-[11px] text-slate-400">Get a passwordless sign-in link</span></span>
                      </button>
                    </div>
                  </motion.div>

                  {authMethod === "password" || authMethod === "emailLink" ? <motion.div variants={itemVariants} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Email address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@college.edu"
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-900 dark:text-white font-semibold placeholder:text-slate-400" required />
                      </div>
                    </div>
                    {authMethod === "password" && <div className="space-y-1.5">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6}
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-900 dark:text-white font-semibold placeholder:text-slate-400" required />
                      </div>
                    </div>}
                      {authMethod === "emailLink" && (
                        <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                          Check your inbox and spam folder for the sign-in link.
                        </div>
                      )}
                  </motion.div> : <motion.div variants={itemVariants} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Phone number</label>
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3.5 font-semibold text-slate-900 focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white">
                          <option value="+91">+91 India</option>
                          <option value="+1">+1 USA/Canada</option>
                          <option value="+44">+44 UK</option>
                          <option value="custom">Other</option>
                        </select>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="9876543210"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-semibold text-slate-900 focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white" />
                      </div>
                      {countryCode === "custom" && (
                        <div className="mt-2">
                          <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">Custom country code</label>
                          <input type="tel" inputMode="numeric" value={customCountryCode}
                            onChange={e => setCustomCountryCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="91"
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-semibold text-slate-900 focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white" />
                          <p className="mt-1 text-[11px] text-slate-400">Enter digits only; the + sign is added automatically.</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                      <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>We&apos;ll send a one-time verification code to your phone.</span>
                    </div>
                  </motion.div>}

                  {phoneConfirmation && authMethod === "phone" && (
                    <motion.div variants={itemVariants} className="space-y-2 rounded-2xl border border-brand/20 bg-brand/5 p-3">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Enter verification code</label>
                      <input inputMode="numeric" value={phoneCode} onChange={e => setPhoneCode(e.target.value)}
                        placeholder="6-digit code" className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand text-slate-900 dark:text-white font-semibold" />
                      <button type="button" onClick={handlePhoneCode} disabled={loading}
                        className="w-full rounded-xl bg-slate-900 text-white py-3 font-bold disabled:opacity-50">Verify phone number</button>
                    </motion.div>
                  )}

                  <motion.button variants={itemVariants} type="submit" disabled={loading}
                    className="w-full relative group overflow-hidden bg-brand hover:bg-brand-600 text-white font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand/25 hover:shadow-brand/40 active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><span className="relative z-10">{authMethod === "phone" ? "Send verification code" : authMethod === "emailLink" ? "Send email link" : (isLogin ? "Login with email" : "Continue to Profile")}</span> <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </motion.button>

                  <motion.div variants={itemVariants} className="text-center pt-2">
                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-slate-500 hover:text-brand font-bold transition-colors">
                      {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                    </button>
                  </motion.div>
                  <div id="phone-recaptcha" />
                </motion.form>
              )}

              {step === "register" && (
                <motion.form key="register" variants={pageVariants} initial="initial" animate="animate" exit="exit" onSubmit={register} className="space-y-5">
                  <motion.div variants={staggerContainer}>
                    <button type="button" onClick={() => setStep("credentials")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2 font-bold transition-colors">
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
              🏔️ Serving the campus community
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