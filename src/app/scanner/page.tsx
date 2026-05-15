"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { motion } from "framer-motion";
import { Loader2, ScanLine, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";

export default function DailyCheckinPage() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [formData, setFormData] = useState({ name: "", paymentMethod: "Cash" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const { sendNotification } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    setSuccessMsg("");
    try {
      await addDoc(collection(db, "transactions"), {
        member: formData.name,
        type: "Daily Visitor",
        amount: 15000,
        method: formData.paymentMethod,
        status: "Success",
        date: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        created_at: serverTimestamp()
      });
      await addDoc(collection(db, "checkins"), {
        member_name: formData.name,
        status: "Success",
        type: "Daily Visitor",
        scanned_at: serverTimestamp()
      });
      setSuccessMsg(language === 'id' ? `Check-in berhasil untuk ${formData.name}!` : `Check-in successful for ${formData.name}!`);
      setFormData({ name: "", paymentMethod: "Cash" });
      sendNotification(t.success, { body: `${formData.name} checked in.` });
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (error) { alert(t.failed); } finally { setIsSubmitting(false); }
  };

  const formatCurrency = (amt: number) => "Rp " + amt.toLocaleString('id-ID');

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header />
        <main className="p-4 sm:p-10 flex-1 overflow-x-hidden flex flex-col items-center justify-start mt-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg space-y-10">
            <div className="space-y-1 text-center">
              <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">{t.dailyCheckin}</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">{formatCurrency(15000)} — {language === 'id' ? "per sesi latihan" : "per training session"}</p>
            </div>

            <div className="glass-card p-10 shadow-2xl relative overflow-hidden group">
              <div className="flex justify-center mb-10">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FF5A2C] to-red-600 flex items-center justify-center shadow-xl shadow-orange-500/20 active:scale-95 transition-transform">
                  <ScanLine className="h-12 w-12 text-white" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">{language === 'id' ? "IDENTITAS PENGUNJUNG" : "VISITOR IDENTITY"}</label>
                  <input required type="text" className="w-full h-14 bg-black/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-foreground placeholder:text-gray-600 focus:outline-none focus:border-[#FF5A2C]/50 transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="..." />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">{language === 'id' ? "METODE PEMBAYARAN" : "PAYMENT METHOD"}</label>
                  <select className="w-full h-14 bg-black/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-[#FF5A2C]/50 appearance-none" value={formData.paymentMethod} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}>
                    <option value="Cash" className="bg-background">CASH</option>
                    <option value="QRIS" className="bg-background">QRIS (Digital Payment)</option>
                  </select>
                </div>

                <div className="glass-dark border border-orange-500/10 rounded-2xl p-6 flex justify-between items-center group-hover:border-orange-500/30 transition-colors">
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{language === 'id' ? "BIAYA MASUK" : "ENTRY FEE"}</span>
                    <p className="text-sm font-bold text-foreground mt-1">{language === 'id' ? "Satu Kali Akses" : "Single Access"}</p>
                  </div>
                  <span className="text-[#FF5A2C] font-black text-2xl heading-font">{formatCurrency(15000)}</span>
                </div>

                {successMsg && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500 text-[10px] text-center font-black uppercase tracking-widest shadow-sm">
                    {successMsg}
                  </motion.div>
                )}

                <button type="submit" disabled={isSubmitting} className="w-full h-16 bg-gradient-to-br from-[#FF5A2C] to-red-600 hover:brightness-110 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{language === 'id' ? "Konfirmasi Akses" : "Confirm Access"} <ArrowUpRight className="h-5 w-5" /></>}
                </button>
              </form>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
