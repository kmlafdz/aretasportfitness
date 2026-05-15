"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "./button";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function SuccessModal({
  isOpen,
  onClose,
  title = "Action Successful",
  message = "Your changes have been saved successfully."
}: SuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0c0c14] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-8 sm:p-10 space-y-8 text-center">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-[2rem] bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                  <CheckCircle2 className="h-10 w-10 text-teal-500" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-white uppercase heading-font tracking-tight">{title}</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={onClose}
                  className="w-full h-16 bg-gradient-to-br from-teal-500 to-teal-600 hover:brightness-110 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-teal-500/20 active:scale-95 transition-all"
                >
                  CONTINUE
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
