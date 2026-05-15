"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Dumbbell, Receipt, ArrowRight, Loader2, CreditCard, LayoutDashboard, FileText } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query as fsQuery, where, limit } from "firebase/firestore";
import Link from "next/link";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";

function SearchResults() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get("q") || "";
  
  const [isSearching, setIsSearching] = useState(true);
  const [results, setResults] = useState<{
    members: any[];
    equipments: any[];
    transactions: any[];
  }>({ members: [], equipments: [], transactions: [] });

  useEffect(() => {
    const performSearch = async () => {
      if (!queryParam) {
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        // Fetch data (Optimized client filtering for real-time feel)
        const [memberSnap, equipSnap, transSnap] = await Promise.all([
          getDocs(collection(db, "members")),
          getDocs(collection(db, "equipment")),
          getDocs(collection(db, "transactions"))
        ]);

        const q = queryParam.trim().toLowerCase();
        const searchMatch = (obj: any) => {
          return Object.values(obj).some(val => 
            String(val).toLowerCase().includes(q)
          );
        };

        const members = memberSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(searchMatch);

        const equipments = equipSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(searchMatch);

        const transactions = transSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(searchMatch);

        setResults({ members, equipments, transactions });
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [queryParam]);

  const totalResults = results.members.length + results.equipments.length + results.transactions.length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase flex items-center gap-4">
            <Search className="h-8 w-8 sm:h-12 sm:w-12 text-[#FF5A2C]" />
            {language === 'id' ? "Hasil Pencarian" : "Search Results"}
          </h1>
          <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase leading-relaxed">
            {isSearching ? t.loading : `${totalResults} ${language === 'id' ? 'HASIL DITEMUKAN UNTUK' : 'RESULTS FOUND FOR'} "${queryParam}"`}
          </p>
        </div>
      </div>

      {!isSearching && totalResults === 0 && queryParam && (
        <div className="glass-card py-24 text-center border-dashed border-2 border-border/50">
          <div className="h-20 w-20 rounded-[2rem] bg-secondary flex items-center justify-center mx-auto mb-6">
            <Search className="h-10 w-10 text-gray-500 opacity-50" />
          </div>
          <h2 className="text-xl font-black text-foreground uppercase heading-font mb-2">{language === 'id' ? "Tidak Ada Hasil" : "No Results Found"}</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{language === 'id' ? "Coba kata kunci lain" : "Try another keyword"}</p>
        </div>
      )}

      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-12 w-12 text-[#FF5A2C] animate-spin" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest animate-pulse">{t.loading}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Members Section */}
          {results.members.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest heading-font">{t.members}</h3>
                </div>
                <span className="text-[10px] font-black text-gray-500 bg-secondary px-3 py-1 rounded-full">{results.members.length}</span>
              </div>
              <div className="space-y-4">
                {results.members.map(m => (
                  <motion.div whileHover={{ y: -3 }} key={m.id} onClick={() => router.push("/members")} className="glass-card p-5 cursor-pointer group hover:border-blue-500/30 transition-all">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-black text-foreground uppercase heading-font group-hover:text-blue-400 transition-colors">{m.nama || m.name}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{m.nomor_whatsapp || m.phone || "-"} • {m.membership_type || "Member"}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-700 group-hover:text-foreground transition-all" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Section */}
          {results.equipments.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <Dumbbell className="h-5 w-5 text-orange-400" />
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest heading-font">{t.equipment}</h3>
                </div>
                <span className="text-[10px] font-black text-gray-500 bg-secondary px-3 py-1 rounded-full">{results.equipments.length}</span>
              </div>
              <div className="space-y-4">
                {results.equipments.map(e => (
                  <motion.div whileHover={{ y: -3 }} key={e.id} onClick={() => router.push("/equipment")} className="glass-card p-5 cursor-pointer group hover:border-orange-400/30 transition-all">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-black text-foreground uppercase heading-font group-hover:text-orange-400 transition-colors">{e.nama || e.name}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{e.kategori || e.category} • {e.kondisi || e.condition}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-700 group-hover:text-foreground transition-all" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Section */}
          {results.transactions.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-teal-400" />
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest heading-font">{t.transactions}</h3>
                </div>
                <span className="text-[10px] font-black text-gray-500 bg-secondary px-3 py-1 rounded-full">{results.transactions.length}</span>
              </div>
              <div className="space-y-4">
                {results.transactions.map(tr => (
                  <motion.div whileHover={{ y: -3 }} key={tr.id} onClick={() => router.push("/transactions")} className="glass-card p-5 cursor-pointer group hover:border-teal-400/30 transition-all">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-black text-foreground uppercase heading-font group-hover:text-teal-400 transition-colors">{tr.member || tr.memberName || "Daily Visitor"}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{tr.type} • Rp {tr.amount?.toLocaleString('id-ID')}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-700 group-hover:text-foreground transition-all" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </motion.div>
  );
}

export default function SearchPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 sm:p-10 overflow-x-hidden">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-10 w-10 text-orange-500 animate-spin" /></div>}>
            <SearchResults />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
