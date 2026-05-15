import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useLanguageStore } from '@/store/useLanguageStore';

interface DigitalCardProps {
  memberId: string;
  name: string;
  status: string;
  qrToken: string;
  expiredAt: string;
}

export function DigitalCard({ memberId, name, status, qrToken, expiredAt }: DigitalCardProps) {
  const { language } = useLanguageStore();
  const isExpired = status === "Expired";

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="w-full max-w-sm mx-auto group"
    >
      <div 
        id="digital-card-export" 
        className="relative w-full aspect-[1.586/1] rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#121212] via-zinc-900 to-[#0a0a0a] z-0" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute inset-0 bg-white/[0.02] z-10" />

      <div className="relative z-20 h-full p-6 flex flex-col justify-between">
        
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 p-1">
               <img src="/logo.png" alt="Logo" className="w-full h-full object-contain no-invert" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-xl tracking-tight leading-tight">Areta Sport</h3>
              <p className="text-[10px] text-[#FF5A2C] font-black tracking-[0.2em] uppercase whitespace-nowrap">{language === 'id' ? "MEMBER PREMIUM" : "PREMIUM MEMBER"}</p>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 mt-4">
          <div className="space-y-5 flex-1 min-w-0">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1">{language === 'id' ? "NAMA MEMBER" : "MEMBER NAME"}</p>
              <p className="text-lg font-bold text-white tracking-wide uppercase leading-tight whitespace-normal break-words">{name}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1">{language === 'id' ? "BERLAKU SAMPAI" : "VALID THRU"}</p>
              <p className={`font-mono text-sm ${isExpired ? 'text-red-500 font-bold' : 'text-gray-200 tracking-wider'}`}>
                {isExpired ? 'EXPIRED' : expiredAt}
              </p>
            </div>
          </div>
          
          <div className="relative p-2.5 bg-white rounded-2xl shadow-lg shrink-0">
            {!isExpired ? (
              <QRCodeSVG value={qrToken} size={80} level="H" className="rounded-lg" />
            ) : (
              <div className="w-[80px] h-[80px] bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-red-500 rotate-[-45deg]">INVALID</span>
              </div>
            )}
          </div>
        </div>

      </div>
      </div>
    </motion.div>
  );
}
