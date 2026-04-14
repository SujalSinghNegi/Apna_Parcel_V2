"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { initSocket } from "@/lib/socket";
import toast from "react-hot-toast";
import Link from "next/link";
import { Package, Mail, Lock, User as UserIcon, ChevronRight, ArrowLeft, Sparkles, GraduationCap, MapPin, Briefcase } from "lucide-react";
import { getErrorMessage } from "@/lib/api";

type Step = "email" | "otp" | "register";

export default function AuthPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
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
        router.push("/dashboard");
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
      router.push("/dashboard");
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); }
  };

  const userTypeOptions = [
    { value: "STUDENT", label: "College Student", icon: GraduationCap, desc: "Studying on campus" },
    { value: "LOCAL_PERSON", label: "Local Resident", icon: MapPin, desc: "Living in the area" },
    { value: "STAFF_FACULTY", label: "Staff / Faculty", icon: Briefcase, desc: "Working on campus" },
  ];

  // Progress bar
  const stepIndex = step === "email" ? 0 : step === "otp" ? 1 : 2;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy" />
      <div className="absolute inset-0 bg-hero-pattern opacity-30" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/20 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-navy-400/20 rounded-full blur-[100px] animate-float-delayed" />
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-mint/10 rounded-full blur-[80px] animate-float-slow" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 group">
          <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand-600 rounded-2xl flex items-center justify-center shadow-xl shadow-brand/30 group-hover:scale-105 transition-transform">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-extrabold text-white leading-none">
              Apna<span className="text-brand-300">Parcel</span>
            </h1>
            <p className="text-[11px] text-white/50 font-medium tracking-wide">Campus Delivery Network</p>
          </div>
        </Link>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {["Account", "Verify", "Profile"].map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1 rounded-full transition-all duration-500 ${i <= stepIndex ? "bg-brand" : "bg-white/10"}`} />
              <p className={`text-[10px] mt-1.5 font-semibold transition-colors ${i <= stepIndex ? "text-brand-300" : "text-white/30"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/20 overflow-hidden">
          <div className="p-7 sm:p-8">
            {step === "email" && (
              <form onSubmit={sendOtp} className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-extrabold text-navy">Welcome back! 👋</h2>
                  <p className="text-navy-500 text-sm mt-1.5">Enter your email to receive a one-time password</p>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy-700">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@college.edu"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-navy font-medium placeholder:text-gray-400 placeholder:font-normal" required />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-brand to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/30 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Continue <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={verifyOtp} className="space-y-6 animate-fade-in">
                <div>
                  <button type="button" onClick={() => setStep("email")}
                    className="flex items-center gap-1.5 text-sm text-navy-400 hover:text-navy-700 mb-4 font-medium transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className="text-2xl font-extrabold text-navy">Check your inbox 📧</h2>
                  <p className="text-navy-500 text-sm mt-1.5">
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-navy-700 bg-navy-50 px-2 py-0.5 rounded-md">{email}</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy-700">Verification Code</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors" />
                    <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, "").slice(0, 6))}
                      placeholder="• • • • • •" maxLength={6}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-2xl tracking-[0.3em] font-mono text-center font-bold text-navy placeholder:tracking-[0.5em]" required />
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    OTP valid for 10 minutes
                  </p>
                </div>
                <button type="submit" disabled={loading || otp.length !== 6}
                  className="w-full bg-gradient-to-r from-brand to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/30 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Verify & Continue <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>
                <button type="button" onClick={sendOtp}
                  className="w-full text-sm text-navy-400 hover:text-brand font-semibold transition-colors py-1">
                  Didn&apos;t get it? Resend OTP
                </button>
              </form>
            )}

            {step === "register" && (
              <form onSubmit={register} className="space-y-5 animate-fade-in">
                <div>
                  <button type="button" onClick={() => setStep("otp")}
                    className="flex items-center gap-1.5 text-sm text-navy-400 hover:text-navy-700 mb-4 font-medium transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className="text-2xl font-extrabold text-navy">Almost there! ✨</h2>
                  <p className="text-navy-500 text-sm mt-1.5">Tell us a bit about yourself</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy-700">Full Name</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors" />
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-navy font-medium placeholder:text-gray-400 placeholder:font-normal" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy-700">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" maxLength={10}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-navy font-medium placeholder:text-gray-400 placeholder:font-normal" />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-navy-700">I am a...</label>
                  <div className="grid grid-cols-3 gap-2">
                    {userTypeOptions.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setUserType(opt.value)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          userType === opt.value
                            ? "border-brand bg-brand-50 ring-2 ring-brand/20"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <opt.icon className={`w-5 h-5 mx-auto mb-1.5 ${userType === opt.value ? "text-brand" : "text-gray-400"}`} />
                        <p className={`text-xs font-bold ${userType === opt.value ? "text-brand" : "text-navy-600"}`}>{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {userType === "STUDENT" && (
                  <div className="space-y-3 p-4 bg-gradient-to-br from-brand-50 to-orange-50 rounded-2xl border border-brand-100 animate-fade-in">
                    <div className="flex items-center gap-2 mb-1">
                      <GraduationCap className="w-4 h-4 text-brand" />
                      <span className="text-xs font-bold text-brand-700">Student Details</span>
                    </div>
                    <input value={collegeName} onChange={e => setCollegeName(e.target.value)} placeholder="College name"
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-brand-100 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 bg-white text-sm font-medium text-navy transition-all" />
                    <div className="flex gap-2">
                      <select value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl border-2 border-brand-100 focus:outline-none focus:border-brand bg-white text-sm font-medium text-navy">
                        {["1ST","2ND","3RD","4TH"].map(y => <option key={y} value={y}>{y} Year</option>)}
                      </select>
                      <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="Branch/Dept"
                        className="flex-1 px-3 py-2.5 rounded-xl border-2 border-brand-100 focus:outline-none focus:border-brand bg-white text-sm font-medium text-navy transition-all" />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-brand to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/30 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Create My Account</>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gradient-to-r from-gray-50 to-stone-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              🏔️ Serving the campus community of Dwarahat, Uttarakhand
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-white/50 hover:text-white/80 font-medium transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
