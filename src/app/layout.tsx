"use client";

import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { QRScannerFAB } from "@/components/QRScannerFAB";
import { NotificationProvider } from "@/components/NotificationProvider";
import { useUIStore } from "@/store/useUIStore";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { motion, AnimatePresence } from "framer-motion";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { theme } = useUIStore();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch and ensure smooth entry
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang="en" className={mounted ? theme : "dark"}>
      <body className={`${inter.variable} ${outfit.variable} font-sans min-h-screen bg-background antialiased text-foreground overflow-x-hidden`}>
        <AnimatePresence mode="wait">
          {!mounted && <LoadingScreen key="loader" />}
        </AnimatePresence>
        <AuthProvider>
          <NotificationProvider>
            {children}
            <QRScannerFAB />
            <Toaster 
              theme={mounted ? (theme as any) : "dark"} 
              position="top-right" 
              richColors 
              toastOptions={{
                style: {
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(40px) saturate(220%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '1.5rem',
                  padding: '20px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                },
                className: 'group !font-sans',
              }}
            />
            <OfflineDetector />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-xs"
        >
          <div className="bg-red-500/10 backdrop-blur-2xl border border-red-500/20 p-6 rounded-[2rem] shadow-2xl flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <span className="text-2xl">📡</span>
            </div>
            <div>
              <p className="text-sm font-black text-white uppercase tracking-widest heading-font">Koneksi Terputus</p>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1">Periksa internet Anda</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
