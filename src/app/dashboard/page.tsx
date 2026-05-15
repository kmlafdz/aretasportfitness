"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Users, DollarSign, UserX, TrendingUp, ArrowUpRight, Activity } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Tooltip
} from 'recharts';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';
import { id, enUS } from 'date-fns/locale';
import { motion } from "framer-motion";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const router = useRouter();
  const [stats, setStats] = useState({
    activeMembers: 0,
    expiredMembers: 0,
    totalMembers: 0,
    dailyVisitors: 0,
    totalCheckIns: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    weeklyData: Array.from({length: 7}).map(() => ({ name: '', value: 0 })),
    paymentData: [
      { name: 'Cash', value: 0, color: '#FF5A2C' },
      { name: 'QRIS', value: 0, color: '#06B6D4' }
    ],
    trendData: Array.from({length: 7}).map(() => ({ name: '', value: 0 })),
    expiringMembers: [] as any[],
  });

  const [dateSubtitle, setDateSubtitle] = useState("");

  useEffect(() => {
    const today = new Date();
    setDateSubtitle(new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    }).format(today));
    today.setHours(0,0,0,0);
    
    const formattedTodayStr = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(today);
    const currentMonthStr = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(today);

    const last7Days = Array.from({length: 7}).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d),
        name: new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'short' }).format(d)
      };
    });

    const unsubMembers = onSnapshot(query(collection(db, "members")), (snapshot) => {
      let active = 0;
      let expired = 0;
      const expiringSoon: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.tanggal_expired) {
          const expDate = new Date(data.tanggal_expired);
          expDate.setHours(0,0,0,0);
          if (expDate >= today) {
            active++;
            const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) expiringSoon.push({ id: doc.id, ...data });
          } else expired++;
        }
      });
      setStats(prev => ({ ...prev, activeMembers: active, expiredMembers: expired, totalMembers: snapshot.size, expiringMembers: expiringSoon }));
    });

    const unsubCheckIns = onSnapshot(query(collection(db, "checkins")), (snapshot) => {
      let daily = 0;
      const weeklyCounts = last7Days.map(d => ({ name: d.name, value: 0 }));
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.scanned_at) {
          const scanDate = data.scanned_at.toDate ? data.scanned_at.toDate() : new Date(data.scanned_at);
          const scanDateStr = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(scanDate);
          if (scanDateStr === formattedTodayStr && data.type === "Daily Visitor") daily++;
          const dayIndex = last7Days.findIndex(d => scanDateStr === d.dateStr);
          if (dayIndex !== -1) weeklyCounts[dayIndex].value++;
        }
      });
      setStats(prev => ({ ...prev, dailyVisitors: daily, weeklyData: weeklyCounts }));
    });

    const unsubTransactions = onSnapshot(query(collection(db, "transactions")), (snapshot) => {
      let todayRev = 0;
      let monthRev = 0;
      let cashTotal = 0;
      let qrisTotal = 0;
      const weeklyRev = last7Days.map(d => ({ name: d.name, value: 0 }));
      snapshot.forEach(doc => {
        const data = doc.data();
        const amt = data.amount || 0;
        if (data.date) {
          if (data.date.includes(formattedTodayStr)) todayRev += amt;
          if (data.date.includes(currentMonthStr)) monthRev += amt;
          if (data.method === "Cash") cashTotal += amt;
          if (data.method === "QRIS") qrisTotal += amt;
          const dayIndex = last7Days.findIndex(d => data.date.includes(d.dateStr));
          if (dayIndex !== -1) weeklyRev[dayIndex].value += amt;
        }
      });
      setStats(prev => ({
        ...prev,
        todayRevenue: todayRev,
        monthlyRevenue: monthRev,
        paymentData: [
          { name: 'Cash', value: cashTotal, color: '#FF5A2C' },
          { name: 'QRIS', value: qrisTotal, color: '#06B6D4' }
        ],
        trendData: weeklyRev
      }));
    });

    return () => { unsubMembers(); unsubCheckIns(); unsubTransactions(); };
  }, [language]);

  const formatCurrency = (amt: number) => {
    return "Rp " + amt.toLocaleString('id-ID');
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header />
        <main className="p-4 lg:p-10 flex-1 overflow-x-hidden space-y-6 lg:space-y-10">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4"
          >
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">{t.dashboard}</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase leading-relaxed">{language === 'id' ? "ANALITIK" : "ANALYTICS"} — {dateSubtitle}</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-[#FF5A2C]/10 border border-[#FF5A2C]/20 px-4 py-2 rounded-2xl text-[#FF5A2C] text-xs font-black uppercase tracking-widest">
              <TrendingUp className="h-4 w-4" />
              {language === 'id' ? "UPDATE LANGSUNG" : "LIVE UPDATES"}
            </div>
          </motion.div>
            
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard label={t.activeMembers} value={stats.activeMembers} icon={Users} color="teal" sub={t.activeNow} href="/members" />
            <StatCard label={language === 'id' ? "EXPIRED" : "EXPIRED"} value={stats.expiredMembers} icon={UserX} color="red" sub="—" href="/members" />
            <StatCard label={t.totalRevenue} value={formatCurrency(stats.monthlyRevenue)} icon={DollarSign} color="orange" sub={language === 'id' ? "Bulan ini" : "This month"} href="/transactions" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="glass-card p-6 lg:p-8 lg:col-span-2 relative overflow-hidden group">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-lg font-black text-foreground heading-font uppercase tracking-wider">{language === 'id' ? "AKTIVITAS MINGGUAN" : "WEEKLY ACTIVITY"}</h2>
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mt-1">{language === 'id' ? "Frekuensi Pengunjung" : "Visitors Frequency"}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="h-2 w-2 rounded-full bg-[#FF5A2C] animate-pulse" />
                  <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Live</span>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.weeklyData} margin={{ left: -30 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF5A2C" />
                        <stop offset="100%" stopColor="#8B2F17" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#555" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                    <YAxis stroke="#555" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '1rem' }}
                      itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" fill="url(#barGradient)" radius={[8, 8, 4, 4]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-8 flex flex-col">
              <h2 className="text-lg font-black text-foreground heading-font uppercase tracking-wider mb-2">{language === 'id' ? "PEMBAYARAN" : "PAYMENT"}</h2>
              <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-8">{language === 'id' ? "Analisis Metode" : "Method Analysis"}</p>
              <div className="flex-1 flex flex-col items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-xl font-black text-foreground heading-font">{(stats.paymentData.reduce((a,b) => a+b.value, 0) / 1000000).toFixed(1)}M</span>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</span>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={stats.paymentData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                      {stats.paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/5">
                {stats.paymentData.map(item => (
                  <div key={item.name} className="space-y-1 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.name}</span>
                    </div>
                    <p className="text-xs font-black text-foreground heading-font">{formatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
            <div className="glass-card p-8">
              <h2 className="text-lg font-black text-foreground heading-font uppercase tracking-wider mb-2">{t.revenueTrends}</h2>
              <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-10">{language === 'id' ? "Pertumbuhan Keuangan" : "Financial Growth"}</p>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trendData} margin={{ left: -30 }}>
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF5A2C" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FF5A2C" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#555" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                    <YAxis stroke="#555" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '1rem' }}
                      itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#FF5A2C" strokeWidth={4} fillOpacity={1} fill="url(#lineGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-8 flex flex-col">
              <h2 className="text-lg font-black text-foreground heading-font uppercase tracking-wider mb-2">{language === 'id' ? "AKAN BERAKHIR" : "EXPIRING SOON"}</h2>
              <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-10">{language === 'id' ? "Peringatan Kritis" : "Critical Alerts"}</p>
              <div className="flex-1 space-y-4">
                {stats.expiringMembers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <Users className="h-10 w-10 text-gray-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{language === 'id' ? "Tidak ada expired" : "No expirations"}</p>
                  </div>
                ) : (
                  stats.expiringMembers.map(member => (
                    <div key={member.id} className="group flex items-center justify-between p-4 glass border border-white/5 rounded-2xl transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-[#FF5A2C]/10 flex items-center justify-center text-[#FF5A2C] font-black text-xs uppercase heading-font">{member.nama.charAt(0)}</div>
                        <div>
                          <p className="text-xs font-black text-foreground uppercase tracking-wide">{member.nama}</p>
                          <p className="text-[9px] font-bold text-gray-500 mt-0.5 tracking-widest">{member.nomor_whatsapp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/10 text-orange-500 text-[9px] font-black uppercase tracking-widest border border-orange-500/20">
                          <Activity className="h-3 w-3" />
                          {formatDistanceToNow(new Date(member.tanggal_expired), { addSuffix: true, locale: language === 'id' ? id : enUS })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub, href }: any) {
  const router = useRouter();
  const colors: any = {
    teal: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    orange: "bg-[#FF5A2C]/10 text-[#FF5A2C] border-[#FF5A2C]/20"
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }} 
      onClick={() => href && router.push(href)}
      className={`glass-card p-6 lg:p-8 relative group shadow-2xl overflow-hidden cursor-pointer transition-all active:scale-95`}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase mb-1.5">{label}</h3>
          <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${colors[color]}`}>
            {sub}
          </div>
        </div>
        <div className={`p-2.5 rounded-2xl border ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <p className="text-2xl lg:text-3xl font-black text-foreground heading-font tracking-tighter truncate">{value}</p>
        <ArrowUpRight className="h-5 w-5 text-gray-700 group-hover:text-foreground transition-colors flex-shrink-0" />
      </div>
    </motion.div>
  );
}
