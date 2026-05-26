"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText, TrendingUp, Users, DollarSign, Activity, Download, ArrowUpRight, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { useNotifications } from "@/hooks/useNotifications";

export default function ReportsPage() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [transactions, setTransactions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { sendNotification } = useNotifications();
  const [isExporting, setIsExporting] = useState(false);
  const [reportFilter, setReportFilter] = useState<'all' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM



  useEffect(() => {
    const qTrans = query(collection(db, "transactions"), orderBy("created_at", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qMembers = query(collection(db, "members"), orderBy("created_at", "desc"));
    const unsubMembers = onSnapshot(qMembers, (snap) => {
      setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qCheckins = query(collection(db, "checkins"), orderBy("scanned_at", "desc"));
    const unsubCheckins = onSnapshot(qCheckins, (snap) => {
      setCheckins(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });

    return () => { unsubTrans(); unsubMembers(); unsubCheckins(); };
  }, []);

  const filteredTransactions = transactions.filter(t => {
    if (reportFilter === 'all') return true;
    if (!t.created_at) return false;
    const date = t.created_at.toDate ? t.created_at.toDate() : new Date(t.created_at);
    const monthStr = date.toISOString().substring(0, 7);
    return monthStr === selectedMonth;
  });

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const activeMembers = members.filter(m => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(m.tanggal_expired) >= today;
  }).length;
  const expiredMembers = members.length - activeMembers;
  const todayCheckins = checkins.filter(c => {
    if (!c.scanned_at) return false;
    const scanDate = c.scanned_at.toDate ? c.scanned_at.toDate() : new Date(c.scanned_at);
    return scanDate.toDateString() === new Date().toDateString();
  }).length;

  const getMonthlyRevenue = () => {
    const monthlyData: Record<string, number> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthlyData[months[d.getMonth()]] = 0;
    }
    transactions.forEach(t => {
      if (!t.created_at) return;
      const date = t.created_at.toDate ? t.created_at.toDate() : new Date(t.created_at);
      const monthStr = months[date.getMonth()];
      if (monthlyData[monthStr] !== undefined) {
        monthlyData[monthStr] += Number(t.amount) || 0;
      }
    });
    return Object.keys(monthlyData).map(key => ({ name: key, total: monthlyData[key] }));
  };

  const formatCurrency = (amt: number) => "Rp " + amt.toLocaleString('id-ID');

  const handleExportPdf = async () => {
    if (!Capacitor.isNativePlatform()) {
      window.print();
      return;
    }

    setIsExporting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // 1. Header & Branding
      doc.setFillColor(10, 12, 20); // Dark background
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("ARETA SPORT", 20, 20);
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("PREMIUM FITNESS MANAGEMENT", 20, 28);
      
      const filterText = reportFilter === 'all' 
        ? (language === 'id' ? "SEMUA LAPORAN" : "ALL REPORTS")
        : (language === 'id' ? `LAPORAN ${selectedMonth}` : `REPORT ${selectedMonth}`);

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(filterText, pageWidth - 20, 20, { align: "right" });
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 20, 28, { align: "right" });

      // 2. Statistics Grid
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      
      const stats = [
        { label: t.totalRevenue, value: formatCurrency(totalRevenue) },
        { label: t.activeMembers, value: activeMembers.toString() },
        { label: "Transactions", value: filteredTransactions.length.toString() },
        { label: "Today Check-ins", value: todayCheckins.toString() }
      ];

      let startX = 20;
      stats.forEach((stat, i) => {
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(startX, 50, 40, 20, 3, 3, 'F');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(stat.label.toUpperCase(), startX + 5, 58);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(stat.value, startX + 5, 65);
        startX += 45;
      });

      // 3. Revenue Trends Chart (Image from canvas)
      const chartEl = document.querySelector('.recharts-wrapper');
      if (chartEl) {
        const canvas = await html2canvas(chartEl as HTMLElement, { scale: 2, backgroundColor: '#ffffff' });
        const chartData = canvas.toDataURL('image/png');
        doc.setFontSize(10);
        doc.text(t.revenueTrends.toUpperCase(), 20, 85);
        doc.addImage(chartData, 'PNG', 20, 90, pageWidth - 40, 60);
      }

      // 4. Ledger Table (Real Text)
      doc.setFontSize(10);
      doc.text(t.recentLedger.toUpperCase(), 20, 165);
      
      const tableData = filteredTransactions.slice(0, 15).map(t_item => [
        t_item.date,
        t_item.member.toUpperCase(),
        t_item.type.toUpperCase(),
        formatCurrency(Number(t_item.amount) || 0)
      ]);

      autoTable(doc, {
        startY: 170,
        head: [['DATE', 'MEMBER', 'TYPE', 'AMOUNT']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [255, 90, 44], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold', textColor: [0, 150, 136] } }
      });

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const fileName = `Areta_Report_${reportFilter === 'all' ? 'All' : selectedMonth}_${new Date().getTime()}.pdf`;

      await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Documents,
      });

      sendNotification("Success", { body: `File Laporan ${fileName} berhasil disimpan di direktori Dokumen` });
    } catch (error) {
      console.error("PDF Export Error:", error);
      sendNotification("Error", { body: "Failed to export PDF" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex min-h-screen print:block" id="report-printable-area">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 print:pl-0">
        <div className="print:hidden">
          <Header />
        </div>
        <main className="p-4 sm:p-10 flex-1 overflow-x-hidden space-y-10 print:p-0">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 print:hidden"
          >
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">{language === 'id' ? "ANALITIK" : "ANALYTICS"}</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">{language === 'id' ? "METRIK PERFORMA & LAPORAN" : "PERFORMANCE METRICS & REPORTS"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                <button 
                  onClick={() => setReportFilter('all')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    reportFilter === 'all' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-gray-500 hover:text-white"
                  )}
                >
                  {language === 'id' ? "Semua" : "All"}
                </button>
                <button 
                  onClick={() => setReportFilter('month')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    reportFilter === 'month' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-gray-500 hover:text-white"
                  )}
                >
                  {language === 'id' ? "Bulan" : "Month"}
                </button>
              </div>

              {reportFilter === 'month' && (
                <input 
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-orange-500/50 transition-all"
                />
              )}

              <button 
                onClick={handleExportPdf}
                disabled={isExporting}
                className="bg-gradient-to-br from-[#FF5A2C] to-red-600 hover:brightness-110 text-white rounded-2xl px-8 py-6 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isExporting ? (language === 'id' ? "MEMPROSES..." : "PROCESSING...") : t.exportPdf}
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label={t.totalRevenue} value={formatCurrency(totalRevenue)} icon={DollarSign} color="orange" sub={t.allTime} />
            <StatCard label={t.activeMembers} value={activeMembers} icon={Users} color="blue" sub={`${expiredMembers} Expired`} />
            <StatCard label={language === 'id' ? "CHECK-IN" : "CHECK-INS"} value={todayCheckins} icon={Activity} color="teal" sub={language === 'id' ? "Akses Hari Ini" : "Today's Access"} />
            <StatCard label={language === 'id' ? "VOLUME" : "VOLUME"} value={transactions.length} icon={FileText} color="purple" sub={language === 'id' ? "Total Transaksi" : "Total Transactions"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
            <div className="glass-card p-8 flex flex-col gap-8 break-inside-avoid">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black text-foreground heading-font uppercase tracking-tight">{t.revenueTrends}</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{language === 'id' ? "Performa 6 bulan terakhir" : "Last 6 Months performance"}</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-teal-500" />
               </div>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getMonthlyRevenue()}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF5A2C" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FF5A2C" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="#555" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#555" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${(value/1000000).toFixed(1)}M`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '16px' }}
                        itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                        labelStyle={{ display: 'none' }}
                        formatter={(val: any) => formatCurrency(val)}
                      />
                      <Area type="monotone" dataKey="total" stroke="#FF5A2C" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="glass-card p-8 flex flex-col gap-8 break-inside-avoid">
               <div>
                  <h2 className="text-xl font-black text-foreground heading-font uppercase tracking-tight">{t.recentLedger}</h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{language === 'id' ? "Mutasi keuangan terbaru" : "Latest financial movements"}</p>
               </div>
               <div className="space-y-4">
                  {transactions.slice(0, 10).map((t_item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl glass border border-white/5 group hover:border-[#FF5A2C]/30 transition-all print:border-black/10 print:bg-transparent">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-[#FF5A2C] transition-colors print:bg-gray-100">
                           <DollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-foreground uppercase tracking-wide print:text-black">{t_item.member}</p>
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t_item.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-teal-600 heading-font">+{formatCurrency(Number(t_item.amount) || 0)}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t_item.date}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Printable Report Header */}
          <div className="hidden print:flex flex-col gap-10 border-b-2 border-black pb-10 mb-10">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="flex items-center justify-center w-20 h-20 rounded-3xl overflow-hidden border-2 border-black/5 bg-white shadow-sm">
                      <img src="/logo.png" alt="Areta Sport Logo" className="w-full h-full object-contain no-invert" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-2xl font-black text-black tracking-widest leading-tight heading-font">ARETA SPORT</span>
                      <span className="text-xs font-bold text-gray-500 tracking-[0.2em] uppercase">Premium Fitness Management</span>
                   </div>
                </div>
                <div className="text-right">
                   <h1 className="text-3xl font-black text-black uppercase tracking-tighter heading-font">{language === 'id' ? "LAPORAN PERFORMA" : "PERFORMANCE REPORT"}</h1>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Generated: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
             </div>
             
             <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.totalRevenue}</p>
                   <p className="text-xl font-black text-black heading-font">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t.activeMembers}</p>
                   <p className="text-xl font-black text-black heading-font">{activeMembers}</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{language === 'id' ? "TRANSAKSI" : "TRANSACTIONS"}</p>
                   <p className="text-xl font-black text-black heading-font">{transactions.length}</p>
                </div>
             </div>
          </div>

        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 2cm; }
          body, html { background: white !important; color: black !important; }
          .glass-card { background: white !important; border: 1px solid #eee !important; color: black !important; box-shadow: none !important; margin-bottom: 2rem; border-radius: 1.5rem; overflow: hidden; }
          .glass { background: white !important; border: 1px solid #eee !important; color: black !important; }
          .text-foreground, h1, h2, h3, p { color: black !important; }
          .text-gray-500 { color: #666 !important; }
          .bg-white\\/5 { background: #f9f9f9 !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:flex { display: flex !important; }
          .print\\:border-black\\/10 { border-color: rgba(0,0,0,0.1) !important; }
          .print\\:bg-transparent { background: transparent !important; }
          .heading-font { font-family: var(--font-outfit), sans-serif !important; }
          .recharts-wrapper { margin-left: -20px !important; }
          .recharts-cartesian-grid-horizontal line { stroke: #eee !important; }
          .recharts-text { fill: #666 !important; font-weight: 700 !important; }
          .recharts-area-path { stroke-width: 2 !important; }
        }
      `}} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  const colors: any = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    teal: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    orange: "bg-[#FF5A2C]/10 text-[#FF5A2C] border-[#FF5A2C]/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20"
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
        <p className="text-2xl font-black text-foreground heading-font tracking-tighter">{value}</p>
        <ArrowUpRight className="h-5 w-5 text-gray-700 group-hover:text-foreground transition-colors" />
      </div>
    </motion.div>
  );
}
