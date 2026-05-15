"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  loading?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed? This action might be irreversible.",
  confirmText = "Yes, Proceed",
  loading = false
}: DeleteConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0c0c14] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-8 sm:p-10 space-y-8 text-center">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-[2rem] bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-white uppercase heading-font tracking-tight">{title}</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <Button 
                  onClick={onConfirm}
                  disabled={loading}
                  className="w-full h-16 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                >
                  {loading ? "PROCESSING..." : confirmText}
                </Button>
                <button 
                  onClick={onClose}
                  className="w-full h-16 bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
