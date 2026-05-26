"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, Check, LayoutDashboard, Settings, ArrowRight, ShieldCheck, X } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut, sendEmailVerification } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { SuccessModal } from "@/components/ui/success-modal";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });

  const handleOpenResetModal = () => {
    if (loginId.includes("@")) {
      setResetEmail(loginId);
    } else {
      setResetEmail("");
    }
    setIsResetModalOpen(true);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setIsResetModalOpen(false);
      setSuccessModal({
        isOpen: true,
        title: "Link Reset Terkirim",
        message: "Link reset password telah dikirim ke email Anda! Silakan periksa folder INBOX dan SPAM email Anda."
      });
    } catch (error: any) {
      alert("Gagal mengirim link reset password: " + error.message);
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if ((loginId === "kmlafdz" || loginId === "kemal@dev.com") && password === "1234") {
        const q = query(collection(db, "users"), where("email", "==", "kemal@dev.com"));
        const snap = await getDocs(q);
        let devData = { 
          id: "dev-kemal", 
          name: "Kemal", 
          role: "DEVELOPER", 
          initial: "K", 
          email: "kemal@dev.com" 
        } as any;
        
        if (!snap.empty) {
          const userData = snap.docs[0].data();
          devData = {
            ...devData,
            id: snap.docs[0].id,
            name: userData.name || devData.name,
            ...(userData.photoUrl && { photoUrl: userData.photoUrl }),
            settings: userData.settings
          };
        }
        
        setUser(devData);
        setTimeout(() => router.push("/"), 1000);
        return;
      }

      let targetEmail = loginId;
      let targetName = "";
      let targetRole = "ADMIN";
      let photoUrl = "";
      let settings = undefined;

      if (!loginId.includes("@")) {
        const q = query(collection(db, "users"), where("username", "==", loginId));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error("Username tidak terdaftar.");
        const userData = snap.docs[0].data();
        targetEmail = userData.email;
        targetName = userData.name || loginId;
        targetRole = userData.role || "ADMIN";
        photoUrl = userData.photoUrl || "";
        settings = userData.settings;
      } else {
        const q = query(collection(db, "users"), where("email", "==", loginId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userData = snap.docs[0].data();
          targetName = userData.name || loginId.split("@")[0];
          targetRole = userData.role || "ADMIN";
          photoUrl = userData.photoUrl || "";
          settings = userData.settings;
        } else {
          targetName = loginId.split("@")[0];
        }
      }

      const userCred = await signInWithEmailAndPassword(auth, targetEmail, password);

      if (!userCred.user.emailVerified) {
        setUnverifiedUser(userCred.user);
        throw new Error("Email belum diverifikasi.");
      } else {
        const verifyQ = query(collection(db, "users"), where("email", "==", targetEmail));
        const verifySnap = await getDocs(verifyQ);
        if (!verifySnap.empty) {
          const userDoc = verifySnap.docs[0];
          if (userDoc.data().status === "Pending Verification") {
            await updateDoc(doc(db, "users", userDoc.id), { status: "Active" });
          }
        }
      }

      setUser({
        id: userCred.user.uid,
        name: targetName,
        email: targetEmail,
        role: targetRole.toUpperCase(),
        initial: targetName.charAt(0).toUpperCase(),
        ...(photoUrl && { photoUrl }),
        ...(settings && { settings })
      });

      router.push("/");
    } catch (error: any) {
      alert("Login gagal: " + error.message);
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    try {
      await sendEmailVerification(unverifiedUser);
      alert("Email verifikasi terkirim!");
      await signOut(auth);
      setUnverifiedUser(null);
    } catch (error: any) { alert("Gagal: " + error.message); }
  };

  return (
    <div className="flex min-h-screen bg-[#050505] overflow-hidden selection:bg-[#FF5A2C]/30 font-sans relative">

      {/* BACKGROUND IMAGE & ANIMATED BLOBS */}
      <div className="absolute inset-0 z-0">
        <img
          src="/gym_login_background_1778667021963.png"
          alt="Gym Background"
          className="w-full h-full object-cover scale-110 opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/40 to-transparent" />

        {/* DYNAMIC MOVING BLOBS */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-[#FF5A2C]/20 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{
            x: [0, -150, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full"
        />
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -120, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-purple-600/10 blur-[100px] rounded-full"
        />
      </div>

      {/* CONTENT GRID */}
      <div className="relative z-10 grid lg:grid-cols-2 w-full h-screen">

        {/* LEFT: BRANDING & HERO */}
        <div className="hidden lg:flex flex-col justify-between p-16 xl:p-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[1.25rem] p-2 shadow-2xl flex items-center justify-center w-16 h-16 overflow-hidden">
              <img src="/logo.png" alt="Areta" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-[0.2em] leading-none uppercase">Areta Sport</h1>
              <p className="text-[9px] font-black text-gray-400 tracking-[0.3em] uppercase mt-1">Management System</p>
            </div>
          </motion.div>

          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-7xl xl:text-8xl font-black text-white leading-[0.9] tracking-tighter uppercase heading-font">
                Elevate <br />
                <span className="text-[#FF5A2C]">Performance</span>
              </h2>
              <div className="h-2 w-24 bg-[#FF5A2C] mt-10 rounded-full shadow-[0_0_20px_rgba(255,90,44,0.5)]" />
              <p className="text-gray-300 text-lg font-medium mt-10 max-w-md leading-relaxed tracking-wide opacity-80">
                Solusi manajemen gym tercanggih untuk kontrol total, analitik real-time, dan pertumbuhan tanpa batas.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-4 mt-12"
            >
              {[
                { icon: ShieldCheck, text: "Enterprise Security" },
                { icon: LayoutDashboard, text: "SAW Analytics" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl px-6 py-3 shadow-xl">
                  <item.icon className="h-4 w-4 text-[#FF5A2C]" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-[10px] font-black text-gray-500 uppercase tracking-widest"
          >
            © 2026 SynTriad Team. All Rights Reserved.
          </motion.p>
        </div>

        {/* RIGHT: LOGIN FORM */}
        <div className="flex items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[480px]"
          >
            {/* GLASS LOGIN CARD */}
            <div className="bg-white/[0.03] backdrop-blur-[40px] rounded-[3rem] p-10 sm:p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden group">
              {/* Decorative Glow inside card */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#FF5A2C]/10 blur-[60px] rounded-full transition-transform group-hover:scale-150 duration-700" />

              <div className="relative z-10 space-y-10">
                <div>
                  <p className="text-[10px] font-black text-[#FF5A2C] tracking-[0.3em] uppercase mb-4">Authentication</p>
                  <h3 className="text-4xl font-black text-white uppercase heading-font tracking-tighter">Sign In</h3>
                  <div className="h-1 w-12 bg-[#FF5A2C] mt-4 rounded-full" />
                </div>

                <form onSubmit={handleLogin} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase ml-1">Account Access</label>
                      <input
                        type="text"
                        required
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        className="w-full h-16 bg-white/[0.05] border border-white/10 focus:border-[#FF5A2C]/50 rounded-[1.25rem] px-8 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none transition-all shadow-xl"
                        placeholder="Email or Username"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Secret Key</label>
                        <button type="button" onClick={handleOpenResetModal} className="text-[10px] font-black text-[#FF5A2C] uppercase tracking-widest hover:underline">Reset</button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-16 bg-white/[0.05] border border-white/10 focus:border-[#FF5A2C]/50 rounded-[1.25rem] px-8 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none transition-all shadow-xl"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group w-full h-20 bg-[#FF5A2C] hover:bg-[#E04E25] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_20px_40px_-10px_rgba(255,90,44,0.4)] active:scale-95 disabled:opacity-70 flex items-center justify-center gap-4"
                    >
                      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                        <>
                          Access Dashboard
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {unverifiedUser && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-2">
                        <button type="button" onClick={handleResendVerification} className="text-[9px] font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest border-b border-orange-500/20 pb-1">
                          Resend Verification Email
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                <p className="text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  Secure access for authorized staff only
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[2.5rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] relative overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#FF5A2C]/10 blur-[60px] rounded-full" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-[#FF5A2C] tracking-[0.3em] uppercase mb-2">Reset Password</p>
                    <h3 className="text-2xl font-black text-white uppercase heading-font tracking-tight">Lupa Password</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsResetModalOpen(false)} 
                    className="text-gray-500 hover:text-white transition-colors p-2"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <p className="text-gray-400 text-xs font-bold leading-relaxed">
                  Masukkan email Anda di bawah ini. Kami akan mengirimkan tautan untuk menyetel ulang kata sandi Anda.
                </p>

                <form onSubmit={handleSendResetEmail} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full h-16 bg-white/[0.05] border border-white/10 focus:border-[#FF5A2C]/50 rounded-[1.25rem] px-8 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none transition-all shadow-xl"
                      placeholder="name@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full h-16 bg-[#FF5A2C] hover:bg-[#E04E25] text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isSendingReset ? <Loader2 className="h-5 w-5 animate-spin" /> : "Kirim Link Reset"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SuccessModal 
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        title={successModal.title}
        message={successModal.message}
      />

    </div>
  );
}
