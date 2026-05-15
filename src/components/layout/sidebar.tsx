"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, LayoutDashboard, Users, CreditCard, Settings, QrCode,
  ClipboardList, X, Calendar, Dumbbell, Wrench, FileText, LogOut, ChevronLeft, Shield,
  MessageCircle, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: MessageCircle, label: "Admin Chat", href: "/chat" },
  { icon: Users, label: "Members", href: "/members" },
  { icon: QrCode, label: "Daily Check-in", href: "/scanner" },
  { icon: Calendar, label: "Check-in Log", href: "/monthly-checkin" },
  { icon: CreditCard, label: "Transactions", href: "/transactions" },
  { icon: Dumbbell, label: "Fitness Equipment", href: "/equipment" },
  { icon: Wrench, label: "Maintenance", href: "/spk" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Shield, label: "Manage User", href: "/users" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarOpen, closeSidebar } = useUIStore();
  const { setUser } = useAuthStore();
  const { language } = useLanguageStore();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Prevent scrolling on mobile when sidebar is open
  useEffect(() => {
    if (isSidebarOpen && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-20 items-center justify-between px-6 border-b border-transparent shrink-0 mt-2">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[1.25rem] p-1 shadow-2xl flex items-center justify-center w-11 h-11 overflow-hidden">
              <img src="/logo.png?v=4" alt="Areta Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-widest leading-none uppercase">Areta Sport</span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-widest mt-1">FITNESS MGMT</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-gray-400" onClick={closeSidebar}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
                  isActive
                    ? "bg-gradient-to-r from-orange-500/20 to-transparent text-white border-l-[3px] border-orange-500"
                    : "text-gray-400 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-orange-500" : "text-gray-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Info Section */}
        <div className="p-6 space-y-4 border-t border-white/5 bg-black/10 mt-auto">
          {currentTime && (
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative group">
                <div className="absolute inset-0 bg-orange-500/10 blur-2xl rounded-full opacity-50" />
                <div className="relative flex flex-col items-center">
                  <span className="text-3xl font-black text-white tracking-[0.2em] heading-font drop-shadow-2xl">
                    {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1 w-1 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] leading-none">SYSTEM TIME</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <p className="text-[9px] font-black text-gray-600 tracking-widest uppercase text-center pt-2">Version 1.0.0 — SynTriad Team</p>
        </div>
      </aside>
    </>
  );
}
