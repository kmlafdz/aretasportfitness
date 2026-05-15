"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { motion } from "framer-motion";
import { Calendar, Search, Activity, User, Trash2, ArrowUpRight, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

interface CheckIn {
  id: string;
  member_name: string;
  type: string;
  status: string;
  scanned_at: any;
}

export default function MonthlyCheckinPage() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "" });
  const [period, setPeriod] = useState<"all" | "today" | "month">("all");

  useEffect(() => {
    const q = query(collection(db, "checkins"), orderBy("scanned_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CheckIn[];
      setCheckins(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredCheckins = checkins.filter(c => {
    const matchesSearch = c.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (period === "today") {
      return c.type === "Daily Visitor";
    }
    if (period === "month") {
      return c.type === "Member Check-in";
    }
    return true;
  });

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', { 
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "checkins", deleteModal.id));
      setDeleteModal({ isOpen: false, id: "" });
    } catch (e) { alert(t.failed); }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header />
        <main className="p-4 sm:p-10 flex-1 overflow-x-hidden space-y-10">
          
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">{t.monthlyCheckin}</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">{language === 'id' ? "RIWAYAT KEHADIRAN PENGUNJUNG" : "HISTORICAL ATTENDANCE DATA"}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#FF5A2C] transition-colors" />
                <input type="text" placeholder={t.search} className="w-full h-14 bg-secondary border-none rounded-2xl pl-16 pr-6 text-sm font-bold text-foreground placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#FF5A2C]/30 transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard label="TOTAL" value={checkins.length} icon={Activity} color="blue" sub={language === 'id' ? "Check-in" : "Check-ins"} />
            <StatCard label={t.members} value={checkins.filter(c => c.type === "Member Check-in").length} icon={User} color="teal" sub={language === 'id' ? "Kehadiran" : "Attendance"} />
            <StatCard label={language === 'id' ? "PENGUNJUNG" : "VISITORS"} value={checkins.filter(c => c.type === "Daily Visitor").length} icon={Calendar} color="orange" sub={language === 'id' ? "Harian" : "Daily"} />
          </div>

          <div className="glass-card overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="w-full sm:w-auto">
                <h2 className="text-lg sm:text-xl font-black text-foreground heading-font uppercase tracking-tight">{language === 'id' ? "Log Kehadiran" : "Attendance Log"}</h2>
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{language === 'id' ? "Sinkronisasi real-time" : "Real-time sync"}</p>
              </div>
              {/* Universal Period Filter */}
              <div className="flex w-full sm:w-auto bg-secondary rounded-2xl p-1 shadow-inner">
                {(['all', 'today', 'month'] as const).map((p) => (
                  <button 
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`flex-1 sm:flex-none py-2 px-4 sm:px-6 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-foreground'}`}
                  >
                    {p === 'all' ? (language === 'id' ? 'SEMUA' : 'ALL') : p === 'today' ? (language === 'id' ? 'HARIAN' : 'DAILY') : (language === 'id' ? 'BULANAN' : 'MONTHLY')}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[400px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 animate-pulse">{t.loading}</p>
                </div>
              ) : filteredCheckins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{language === 'id' ? "Data tidak ditemukan." : "No matching activity found."}</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead>
                        <tr className="bg-black/5 border-b border-border">
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">MEMBER / VISITOR</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-center">TYPE</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-center">STATUS</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-right">TIMESTAMP</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-right">AKSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredCheckins.map((checkin) => (
                          <tr key={checkin.id} className="hover:bg-secondary/50 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${checkin.type === 'Daily Visitor' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                  {checkin.type === 'Daily Visitor' ? <Activity className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                </div>
                                <span className="font-black text-foreground heading-font uppercase tracking-wide">{checkin.member_name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{checkin.type}</span>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-teal-500 bg-teal-500/10 px-4 py-1.5 rounded-xl border border-teal-500/20">
                                <div className="w-1 h-1 rounded-full bg-teal-500"></div>
                                SUCCESS
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">{formatDateTime(checkin.scanned_at)}</td>
                            <td className="px-8 py-6 text-right">
                              <button onClick={() => handleDelete(checkin.id)} className="p-2.5 bg-red-500/5 text-red-500/40 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden p-4 space-y-4">
                    {filteredCheckins.map((checkin) => (
                      <motion.div key={checkin.id} className="glass-card p-5 space-y-4 border border-border shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${checkin.type === 'Daily Visitor' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                              {checkin.type === 'Daily Visitor' ? <Activity className="h-5 w-5" /> : <User className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-foreground heading-font uppercase tracking-tight">{checkin.member_name}</p>
                              <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mt-0.5">{checkin.type}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDelete(checkin.id)} className="p-2 text-red-500/40 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="pt-2 border-t border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{formatDateTime(checkin.scanned_at)}</span>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-teal-500 bg-teal-500/10 px-3 py-1 rounded-lg">SUCCESS</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
      <DeleteConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "" })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  const colors: any = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    teal: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    orange: "bg-[#FF5A2C]/10 text-[#FF5A2C] border-[#FF5A2C]/20"
  };

  return (
    <motion.div whileHover={{ y: -5 }} className="glass-card p-8 relative group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xs font-black text-gray-500 tracking-[0.3em] uppercase mb-1.5">{label}</h3>
          <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest ${colors[color]}`}>
            {sub}
          </div>
        </div>
        <div className={`p-3 rounded-2xl border ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-4xl font-black text-foreground heading-font tracking-tighter">{value}</p>
        <ArrowUpRight className="h-5 w-5 text-gray-700 group-hover:text-foreground transition-colors" />
      </div>
    </motion.div>
  );
}
