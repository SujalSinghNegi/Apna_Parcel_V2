"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import {api} from "@/lib/api";
import { initSocket } from "@/lib/socket";
import toast from "react-hot-toast";
import { Package, Mail, Lock, User as UserIcon, ChevronRight, ArrowLeft } from "lucide-react";

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
    } catch { } finally { setLoading(false); }
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
    } catch { } finally { setLoading(false); }
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
    } catch { } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl shadow-xl mb-4">
            <Package className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ApnaParcel</h1>
          <p className="text-slate-400 mt-1 text-sm">Apni Zaroorat, Apno Ka Kartavya</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {step === "email" && (
              <form onSubmit={sendOtp} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
                  <p className="text-gray-500 text-sm mt-1">Enter your email to receive a one-time password</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rahul@college.edu"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" required />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Send OTP</span><ChevronRight className="w-5 h-5" /></>}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={verifyOtp} className="space-y-6">
                <div>
                  <button type="button" onClick={() => setStep("email")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
                  <h2 className="text-2xl font-bold text-gray-900">Enter OTP</h2>
                  <p className="text-gray-500 text-sm mt-1">Sent to <span className="font-medium text-gray-700">{email}</span></p>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">6-Digit OTP</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, "").slice(0, 6))}
                      placeholder="Enter 6-digit OTP" maxLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-2xl tracking-widest font-mono" required />
                  </div>
                  <p className="text-xs text-gray-400">OTP valid for 10 minutes</p>
                </div>
                <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Verify OTP</span><ChevronRight className="w-5 h-5" /></>}
                </button>
                <button type="button" onClick={sendOtp} className="w-full text-sm text-gray-500 hover:text-orange-500 transition-colors">Resend OTP</button>
              </form>
            )}

            {step === "register" && (
              <form onSubmit={register} className="space-y-5">
                <div>
                  <button type="button" onClick={() => setStep("otp")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
                  <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                  <p className="text-gray-500 text-sm mt-1">Almost there! Fill in your details.</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Rahul Sharma"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Phone (optional)</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" maxLength={10}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">I am a...</label>
                  <select value={userType} onChange={e => setUserType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                    <option value="STUDENT">College Student</option>
                    <option value="LOCAL_PERSON">Local Resident</option>
                    <option value="STAFF_FACULTY">College Staff / Faculty</option>
                  </select>
                </div>
                {userType === "STUDENT" && (
                  <div className="space-y-3 p-4 bg-orange-50 rounded-xl">
                    <input value={collegeName} onChange={e => setCollegeName(e.target.value)} placeholder="College name"
                      className="w-full px-4 py-2.5 rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white text-sm" />
                    <div className="flex gap-3">
                      <select value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white text-sm">
                        {["1ST","2ND","3RD","4TH"].map(y => <option key={y} value={y}>{y} Year</option>)}
                      </select>
                      <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="Branch/Dept"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white text-sm" />
                    </div>
                  </div>
                )}
                <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Create Account 🎉"}
                </button>
              </form>
            )}
          </div>
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Serving Dwarahat, Uttarakhand 📦</p>
          </div>
        </div>
      </div>
    </div>
  );
}
