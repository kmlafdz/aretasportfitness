"use client";

import { Search, Menu, User as UserIcon, LogOut, Settings, X as CloseX, Users, CreditCard, Dumbbell, ArrowUpRight, Loader2, LayoutDashboard, FileText, QrCode, Calendar, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { cn } from "@/lib/utils";

export function Header() {
  const { toggleSidebar, theme, toggleTheme } = useUIStore();
  const { user, setUser } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const t = translations[language];
  const router = useRouter();
  
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleGlobalSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results: any[] = [];
      const queryLower = val.toLowerCase();

      // 1. Static Navigation Search
      const navItems = [
        { name: t.dashboard, type: "page", href: "/dashboard", icon: LayoutDashboard },
        { name: t.members, type: "page", href: "/members", icon: Users },
        { name: t.equipment, type: "page", href: "/equipment", icon: Dumbbell },
        { name: t.reports, type: "page", href: "/reports", icon: FileText },
        { name: t.transactions, type: "page", href: "/transactions", icon: CreditCard },
        { name: t.dailyCheckin, type: "page", href: "/scanner", icon: QrCode },
        { name: t.monthlyCheckin, type: "page", href: "/monthly-checkin", icon: Calendar },
        { name: t.spk, type: "page", href: "/spk", icon: Wrench },
        { name: t.expenses, type: "page", href: "/expenses", icon: CreditCard },
        { name: t.settings, type: "page", href: "/settings", icon: Settings },
      ];

      const matchedPages = navItems.filter(p => p.name.toLowerCase().includes(queryLower));
      results.push(...matchedPages);

      // 2. Firestore Collection Search (Only if val >= 2)
      if (val.length >= 2) {
        const collections = ["members", "transactions", "equipment"];
        for (const col of collections) {
          // Note: Firestore doesn't support case-insensitive contains easily without additional plugins
          // We use >= and <= for prefix matching
          const q = query(collection(db, col), where("nama", ">=", val), where("nama", "<=", val + "\uf8ff"), limit(2));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            results.push({ id: doc.id, type: col, ...doc.data() });
          });
          
          // Also try title-case if Indonesian (Budi vs budi)
          const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
          if (capitalized !== val) {
             const q2 = query(collection(db, col), where("nama", ">=", capitalized), where("nama", "<=", capitalized + "\uf8ff"), limit(2));
             const snap2 = await getDocs(q2);
             snap2.forEach(doc => {
               if (!results.find(r => r.id === doc.id)) {
                 results.push({ id: doc.id, type: col, ...doc.data() });
               }
             });
          }
        }
      }
      
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-20 lg:h-24 shrink-0 items-center gap-x-3 bg-transparent px-3 sm:px-8">
        <div className="flex items-center lg:hidden">
          <Button variant="ghost" size="icon" className="text-foreground hover:bg-white/10 rounded-xl" onClick={toggleSidebar}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="flex flex-1 items-center justify-between gap-x-4 lg:gap-x-6 glass-dark rounded-[2rem] px-4 sm:px-6 py-2 border border-border shadow-2xl">
          <div className="flex flex-1 max-w-md group relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-[#FF5A2C] transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleGlobalSearch(e.target.value)}
                  placeholder={t.search}
                  className="w-full bg-secondary border border-border rounded-2xl py-2.5 pl-12 pr-4 text-sm text-foreground placeholder:text-gray-500 focus:outline-none focus:border-[#FF5A2C]/30 transition-all"
                />
              </div>
            </form>

            <AnimatePresence>
              {searchQuery.length >= 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-4 bg-[#1a1d2e] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden z-[60] backdrop-blur-2xl"
                >
                  <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 text-orange-500 animate-spin" /></div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-8 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">No results found</div>
                    ) : (
                      <div className="space-y-2">
                        {searchResults.map((res) => (
                          <button 
                            key={res.id || res.href} 
                            onClick={() => { router.push(res.href || `/${res.type === 'members' ? 'members' : res.type === 'equipment' ? 'equipment' : 'transactions'}`); setSearchQuery(""); }}
                            className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                                {res.type === 'page' ? <Settings className="h-5 w-5 text-purple-400" /> : res.type === 'members' ? <Users className="h-5 w-5 text-blue-400" /> : res.type === 'transactions' ? <CreditCard className="h-5 w-5 text-teal-400" /> : <Dumbbell className="h-5 w-5 text-orange-400" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-white heading-font uppercase">{res.nama || res.member || res.name}</span>
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{res.type === 'page' ? (language === 'id' ? 'SISTEM' : 'SYSTEM') : res.type}</span>
                              </div>
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-x-4 lg:gap-x-6 relative" ref={profileRef}>
            {/* Mobile Actions */}
            <div className="lg:hidden flex items-center gap-2">
            </div>

            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-x-3 bg-white/5 border border-white/5 rounded-full p-1 sm:pr-4 cursor-pointer hover:bg-white/10 transition-all active:scale-95 select-none shadow-lg group"
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-black text-white overflow-hidden shadow-lg transition-all",
                user?.role === 'DEVELOPER' 
                  ? "p-[2px] bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 ring-2 ring-blue-500/20" 
                  : "bg-gradient-to-br from-[#FF5A2C] to-red-600 border border-white/10"
              )}>
                <div className="w-full h-full rounded-full overflow-hidden bg-[#1e2130] flex items-center justify-center">
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="Profile" className="h-full w-full object-cover no-invert" />
                  ) : (
                    user?.initial || "U"
                  )}
                </div>
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] font-black text-foreground leading-none heading-font tracking-wide uppercase">{user?.name || "User"}</span>
                <span className={cn(
                  "text-[9px] font-black mt-1 uppercase tracking-widest",
                  user?.role === 'DEVELOPER' ? "text-blue-400" : "text-[#FF5A2C]"
                )}>{user?.role || "GUEST"}</span>
              </div>
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-4 w-60 bg-[#1a1d2e] backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden py-3 z-50 border border-white/10 rounded-[2rem]"
                >
                  <div className="px-5 py-4 border-b border-white/5 bg-white/5">
                    <p className="text-xs font-black text-foreground truncate heading-font uppercase tracking-tight">{user?.name}</p>
                    <p className={cn(
                      "text-[9px] font-black uppercase tracking-[0.2em] mt-1",
                      user?.role === 'DEVELOPER' ? "text-blue-400" : "text-[#FF5A2C]"
                    )}>{user?.role}</p>
                  </div>

                  <div className="px-2 py-2">
                    <button 
                      onClick={() => { router.push("/settings"); setIsProfileOpen(false); }}
                      className="w-full flex items-center gap-4 px-4 py-3 text-sm font-bold text-gray-400 hover:text-foreground hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <div className="p-2 bg-white/5 rounded-xl group-hover:bg-[#FF5A2C]/10 transition-colors">
                        <UserIcon className="h-4 w-4 group-hover:text-[#FF5A2C] transition-colors" />
                      </div>
                      {language === 'id' ? 'Profil' : 'Profile'}
                    </button>
                  </div>
                  <div className="my-2 border-t border-white/5" />
                  <button 
                    onClick={() => { setIsProfileOpen(false); setLogoutModalOpen(true); }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all group"
                  >
                    <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DeleteConfirmModal 
            isOpen={logoutModalOpen}
            onClose={() => setLogoutModalOpen(false)}
            onConfirm={handleLogout}
            title="Logout"
            message={language === 'id' ? "Apakah Anda yakin ingin keluar?" : "Are you sure you want to logout?"}
            confirmText={language === 'id' ? "Ya, Keluar" : "Yes, Logout"}
          />
        </div>
      </header>

    </>
  );
}
