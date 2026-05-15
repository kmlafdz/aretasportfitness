"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { motion } from "framer-motion";
import { CreditCard, FileText, Loader2, ArrowUpRight, TrendingUp } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function TransactionsPage() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalRevenue = transactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const formatCurrency = (amt: number) => "Rp " + amt.toLocaleString('id-ID');

  const handleExportPdf = () => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text("ARETA SPORT FITNESS", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("LAPORAN TRANSAKSI KEUANGAN", 14, 30);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 38);
    
    // Summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Pendapatan: ${formatCurrency(totalRevenue)}`, 14, 50);
    doc.text(`Total Transaksi: ${transactions.length}`, 14, 58);

    // Table
    const tableData = transactions.map(item => [
      item.member,
      item.type,
      formatCurrency(item.amount),
      item.method,
      item.status,
      item.date
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["MEMBER", "KATEGORI", "NOMINAL", "METODE", "STATUS", "TANGGAL"]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [255, 90, 44] }, // Brand Orange
    });

    doc.save(`Areta_Transactions_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header />
        <main className="p-4 sm:p-10 flex-1 overflow-x-hidden space-y-10">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6"
          >
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">{t.transactions}</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">{language === 'id' ? "ALIRAN KEUANGAN & RIWAYAT PEMBAYARAN" : "FINANCIAL FLOW & PAYMENT HISTORY"}</p>
            </div>
            <button 
              onClick={handleExportPdf}
              className="bg-gradient-to-br from-[#FF5A2C] to-red-600 hover:brightness-110 text-white rounded-2xl px-8 py-6 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95 flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {t.exportPdf}
            </button>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard label={t.totalRevenue} value={formatCurrency(totalRevenue)} icon={TrendingUp} color="orange" sub={t.allTime} />
            <StatCard label={language === 'id' ? "JUMLAH" : "COUNT"} value={transactions.length} icon={CreditCard} color="blue" sub={t.transactions} />
            <StatCard label={language === 'id' ? "TINGKAT" : "SUCCESS"} value="100%" icon={TrendingUp} color="teal" sub="Rate" />
          </div>

          <div className="glass-card overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
               <div>
                  <h2 className="text-xl font-black text-foreground heading-font uppercase tracking-tight">{language === 'id' ? "Buku Kas Keuangan" : "Financial Ledger"}</h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{language === 'id' ? "Data sinkron secara real-time" : "Real-time synchronized data"}</p>
               </div>
            </div>
            <div className="min-h-[400px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 blur-xl bg-orange-500/20 rounded-full animate-pulse"></div>
                    <Loader2 className="h-12 w-12 text-[#FF5A2C] animate-spin relative z-10" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 animate-pulse">{language === 'id' ? "Menyinkronkan database..." : "Syncing database..."}</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{language === 'id' ? "Belum ada transaksi." : "No transactions recorded yet."}</p>
                </div>
              ) : (
                <div className="flex flex-col lg:block">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead>
                        <tr className="bg-black/5 border-b border-border">
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">{language === 'id' ? "MEMBER" : "MEMBER"}</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">{language === 'id' ? "KATEGORI" : "CATEGORY"}</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-center">{language === 'id' ? "NOMINAL" : "AMOUNT"}</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-center">{language === 'id' ? "METODE" : "METHOD"}</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-center">STATUS</th>
                          <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-right">TIMESTAMP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {transactions.map((item) => (
                          <tr key={item.id} className="hover:bg-secondary/50 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                    <CreditCard className="h-5 w-5" />
                                  </div>
                                  <span className="font-black text-foreground heading-font uppercase tracking-wide">{item.member}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{item.type}</span>
                            </td>
                            <td className="px-8 py-6 text-center font-black text-foreground">{formatCurrency(item.amount)}</td>
                            <td className="px-8 py-6 text-center">
                              <span className="bg-secondary px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-500 border border-border">{item.method}</span>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-teal-500 bg-teal-500/10 px-4 py-1.5 rounded-xl border border-teal-500/20">
                                  <div className="w-1 h-1 rounded-full bg-teal-500"></div>
                                  {item.status}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden p-4 space-y-4">
                    {transactions.map((item) => (
                      <div key={item.id} className="glass-card p-5 space-y-4 border border-border shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                              <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-foreground heading-font uppercase tracking-tight">{item.member}</p>
                              <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mt-0.5">{item.type}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-teal-500 bg-teal-500/10 px-3 py-1 rounded-lg border border-teal-500/20">
                            {item.status}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-end pt-2 border-t border-border">
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'id' ? 'NOMINAL' : 'AMOUNT'}</p>
                            <p className="text-base font-black text-foreground heading-font tracking-tight">{formatCurrency(item.amount)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'id' ? 'METODE' : 'METHOD'}</p>
                            <span className="bg-secondary px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest text-gray-500">{item.method}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                           <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-right">{item.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
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
        <p className="text-3xl font-black text-foreground heading-font tracking-tighter">{value}</p>
        <ArrowUpRight className="h-5 w-5 text-gray-700 group-hover:text-foreground transition-colors" />
      </div>
    </motion.div>
  );
}
