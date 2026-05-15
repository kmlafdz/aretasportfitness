"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, X, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export function QRScannerFAB() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [memberInfo, setMemberInfo] = useState<{ id: string, name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (isOpen && scanStatus === "idle" && user && pathname !== "/login") {
      try {
        scanner = new Html5QrcodeScanner(
          "fab-reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          /* verbose= */ false
        );

        scanner.render(
          async (decodedText) => {
            if (scanner) {
              scanner.clear();
            }
            setScanStatus("loading");
            
            try {
              const q = query(collection(db, "members"), where("qr_token", "==", decodedText));
              const querySnapshot = await getDocs(q);
              
              if (querySnapshot.empty) {
                setErrorMessage("QR Code tidak ditemukan.");
                setScanStatus("error");
                return;
              }

              const memberDoc = querySnapshot.docs[0];
              const memberData = memberDoc.data();
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const expDate = new Date(memberData.tanggal_expired);
              
              if (expDate < today) {
                setErrorMessage("Membership sudah kadaluarsa.");
                setScanStatus("error");
                return;
              }

              const scanDateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
              
              const checkQ = query(
                collection(db, "checkins"), 
                where("member_id", "==", memberDoc.id), 
                where("scan_date", "==", scanDateStr)
              );
              const checkSnap = await getDocs(checkQ);
              
              if (!checkSnap.empty) {
                setErrorMessage("Member sudah check-in hari ini.");
                setScanStatus("error");
                return;
              }

              await addDoc(collection(db, "checkins"), {
                member_id: memberDoc.id,
                member_name: memberData.nama,
                qr_token: decodedText,
                status: "Success",
                type: "Member Check-in",
                scan_date: scanDateStr,
                scanned_at: serverTimestamp()
              });

              setScanResult(memberDoc.id);
              setMemberInfo({ id: memberDoc.id, name: memberData.nama });
              setScanStatus("success");
            } catch (error) {
              console.error("Error validating QR:", error);
              setErrorMessage("Kesalahan sistem.");
              setScanStatus("error");
            }
          },
          (error) => {}
        );
      } catch (e) {
        console.log("Scanner init failed", e);
      }
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [isOpen, scanStatus, user, pathname]);

  const resetScanner = () => {
    setScanResult(null);
    setMemberInfo(null);
    setErrorMessage("");
    setScanStatus("idle");
  };

  const closeScanner = () => {
    setIsOpen(false);
    resetScanner();
  };

  const normalizedPath = pathname.toLowerCase();
  if (normalizedPath === "/login" || normalizedPath.startsWith("/chat") || !user) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed z-40 bg-gradient-to-br from-[#ff5a2c] to-red-600 text-white p-4 rounded-full shadow-[0_15px_40px_rgba(255,90,44,0.4)] transition-all hover:scale-110 flex items-center justify-center group active:scale-95 ${
          pathname === "/chat" ? "bottom-24 right-6" : "bottom-6 right-6"
        }`}
      >
        <Scan className="h-6 w-6" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 ease-in-out font-black text-[10px] uppercase tracking-widest group-hover:ml-3 group-hover:mr-1">
          Scan Member
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg glass-dark rounded-[2.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.6)] overflow-hidden relative flex flex-col"
            >
              <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-2xl bg-[#FF5A2C]/10 border border-[#FF5A2C]/20">
                    <Scan className="h-5 w-5 text-[#FF5A2C]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white heading-font uppercase tracking-tight">Member Scanner</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Verifikasi Keanggotaan</p>
                  </div>
                </div>
                <button onClick={closeScanner} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-8">
                {scanStatus === "idle" && (
                  <div className="relative rounded-[2rem] overflow-hidden border-2 border-dashed border-white/10 bg-black/40 group transition-all hover:border-[#FF5A2C]/30">
                    <div id="fab-reader" className="w-full mx-auto"></div>
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <div className="px-4 py-2 rounded-full bg-[#FF5A2C] text-white text-[10px] font-black uppercase tracking-widest shadow-lg">Siap Memindai</div>
                    </div>
                  </div>
                )}

                {scanStatus === "loading" && (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                    <div className="relative">
                      <div className="absolute inset-0 blur-xl bg-[#FF5A2C]/20 rounded-full animate-pulse"></div>
                      <Loader2 className="h-16 w-16 text-[#FF5A2C] animate-spin relative z-10" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-black text-white heading-font uppercase tracking-tight">Memvalidasi...</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sinkronisasi Database Areta</p>
                    </div>
                  </div>
                )}

                {scanStatus === "success" && (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-8">
                    <div className="relative">
                       <div className="absolute inset-0 blur-2xl bg-teal-500/30 rounded-full"></div>
                       <div className="h-24 w-24 rounded-full bg-teal-500/10 border-4 border-teal-500/20 flex items-center justify-center relative z-10">
                          <CheckCircle2 className="h-12 w-12 text-teal-500" />
                       </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-white heading-font uppercase tracking-tighter">Check-In Berhasil</h2>
                      <div className="inline-flex items-center px-4 py-1 rounded-full bg-teal-500/10 text-teal-500 text-[10px] font-black uppercase tracking-widest border border-teal-500/20">Akses Diberikan</div>
                    </div>
                    
                    <div className="w-full p-6 rounded-3xl glass border border-white/5 space-y-4">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Member</span>
                          <span className="text-sm font-black text-white uppercase tracking-wide">{memberInfo?.name}</span>
                       </div>
                       <div className="w-full h-px bg-white/5"></div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Member</span>
                          <span className="text-xs font-bold text-gray-500">#{memberInfo?.id.slice(-8).toUpperCase()}</span>
                       </div>
                    </div>

                    <button onClick={resetScanner} className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 active:scale-95 shadow-lg">
                      Scan Member Lain
                    </button>
                  </div>
                )}

                {scanStatus === "error" && (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-8">
                    <div className="relative">
                       <div className="absolute inset-0 blur-2xl bg-red-500/30 rounded-full"></div>
                       <div className="h-24 w-24 rounded-full bg-red-500/10 border-4 border-red-500/20 flex items-center justify-center relative z-10">
                          <XCircle className="h-12 w-12 text-red-500" />
                       </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-white heading-font uppercase tracking-tighter">Akses Ditolak</h2>
                      <div className="inline-flex items-center px-4 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20">Kesalahan Validasi</div>
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wide px-10">{errorMessage}</p>
                    <button onClick={resetScanner} className="w-full h-14 rounded-2xl bg-[#FF5A2C] text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95">
                      Coba Lagi
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        #fab-reader { border: none !important; }
        #fab-reader video { border-radius: 2rem; object-fit: cover; }
        #fab-reader img[alt="Camera based scan"], #fab-reader img[alt="Fule based scan"] { 
          filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(346deg) brightness(101%) contrast(101%) !important; 
          opacity: 1 !important; 
        }
        #fab-reader__dashboard_section_csr span { 
          color: #fff !important; 
          font-family: var(--font-inter) !important; 
          text-transform: uppercase !important; 
          font-size: 10px !important; 
          letter-spacing: 0.1em !important; 
          font-weight: 900 !important; 
        }
        /* Style for 'Or drop an image to scan' text */
        #fab-reader__dashboard_section_csr div {
          color: #FF5A2C !important;
          font-weight: 900 !important;
          font-size: 10px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          margin-top: 8px !important;
        }
        #fab-reader__dashboard_section_swaplink { color: #FF5A2C !important; font-weight: 900 !important; font-size: 10px !important; text-decoration: none !important; text-transform: uppercase !important; }
        #fab-reader__camera_selection { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 0.75rem !important; color: white !important; font-size: 11px !important; padding: 4px !important; }
        #fab-reader__dashboard_section_csr button, #html5-qrcode-button-file-selection { 
          background: rgba(255,90,44,0.1) !important; 
          border: 1px solid rgba(255,90,44,0.3) !important; 
          border-radius: 1.25rem !important; 
          color: #FF5A2C !important; 
          padding: 12px 24px !important; 
          text-transform: uppercase !important; 
          font-weight: 900 !important; 
          font-size: 10px !important; 
          letter-spacing: 0.1em !important;
          transition: all 0.3s ease !important;
          cursor: pointer !important;
        }
        #fab-reader__dashboard_section_csr button:hover, #html5-qrcode-button-file-selection:hover {
          background: rgba(255,90,44,0.2) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 20px rgba(255,90,44,0.2) !important;
        }
        #html5-qrcode-anchor-scan-type-change { 
          color: #FF5A2C !important; 
          font-weight: 900 !important; 
          font-size: 10px !important; 
          text-decoration: none !important; 
          text-transform: uppercase !important; 
          letter-spacing: 0.1em !important;
          margin-top: 1.5rem !important;
          display: inline-block !important;
        }
      `}} />
    </>
  );
}
