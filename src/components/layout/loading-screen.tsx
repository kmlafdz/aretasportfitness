"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 20);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0c14] overflow-hidden"
    >
      {/* AMBIENT PULSES */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full"
      />

      {/* CENTER CONTENT */}
      <div className="relative z-10 flex flex-col items-center">
        {/* LOGO CONTAINER WITH ROTATING SHAPES */}
        <div className="relative flex items-center justify-center">
          {/* Animated Outlines */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute w-[180px] h-[180px] border-2 border-blue-500/20 border-t-blue-500/80 rounded-[3rem]"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute w-[210px] h-[210px] border border-purple-500/10 border-b-purple-500/60 rounded-[3.5rem]"
          />

          {/* MAIN GLASS CONTAINER */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative glass-dark p-8 rounded-[2.5rem] border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)] backdrop-blur-3xl overflow-hidden group"
          >
            {/* Glow Accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
            
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src="/logo.png?v=4" alt="Areta Logo" className="h-24 w-24 object-contain rounded-[2rem]" />
            </motion.div>
          </motion.div>
        </div>

        {/* BRANDING TEXT */}
        <div className="mt-16 text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col gap-2"
          >
            <h2 className="text-4xl font-black heading-font tracking-[0.2em] text-white uppercase">
              ARETA <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">SPORT</span>
            </h2>
            <p className="text-[10px] font-black text-gray-500 tracking-[0.4em] uppercase">Premium Fitness Management</p>
          </motion.div>
        </div>

        {/* PROGRESS INDICATOR */}
        <div className="mt-16 w-64 space-y-4">
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">System Booting...</span>
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{progress}%</span>
          </div>
        </div>
      </div>

      {/* FOOTER BRANDING */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-12"
      >
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl px-8 py-3 rounded-full shadow-2xl">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-4">
            <span className="text-white/40">Application Version 1.2.0</span>
            <span className="h-3 w-[1px] bg-white/10" />
            <span>© 2026 SynTriad Team</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
