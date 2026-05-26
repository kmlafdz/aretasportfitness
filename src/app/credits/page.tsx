"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { motion } from "framer-motion";
import { Mail, ShieldCheck, Target, Users, Code, Server, User, ArrowLeft } from "lucide-react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import { useRouter } from "next/navigation";

export default function CreditsPage() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const router = useRouter();

  const teamMembers = [
    {
      name: "Muhammad Kemal Afrilidzi",
      email: "19231113@bsi.ac.id",
      role: "Project Manager, System Analyst, & UI/UX Designer",
      icon: User,
      photo: "/kemal_pp.jpg",
      iconColor: "text-orange-500 bg-orange-500/10 border-orange-500/20",
      description: "Bertanggung jawab dalam perencanaan dan pengelolaan keseluruhan proyek mulai dari requirement gathering, analisis kebutuhan sistem, perancangan alur sistem, hingga pengawasan pengembangan aplikasi. Selain itu juga berperan dalam desain antarmuka (UI/UX) agar sistem mudah digunakan, modern, dan responsif bagi pengguna.",
      contributions: [
        "Analisis kebutuhan sistem",
        "Penyusunan dokumentasi proyek",
        "Perancangan user flow dan struktur sistem",
        "Desain antarmuka aplikasi",
        "Koordinasi tim pengembang"
      ]
    },
    {
      name: "Priska Cherriati",
      email: "19231034@bsi.ac.id",
      role: "Frontend Developer & Documentation Specialist",
      icon: Code,
      photo: "/priska_pp.png",
      iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      description: "Bertanggung jawab dalam pengembangan tampilan aplikasi (frontend) serta memastikan antarmuka berjalan dengan baik di berbagai perangkat. Selain itu juga membantu penyusunan dokumentasi sistem dan pengujian tampilan aplikasi.",
      contributions: [
        "Implementasi halaman frontend",
        "Pengembangan komponen antarmuka",
        "Optimasi tampilan responsif",
        "Penyusunan dokumentasi visual",
        "Pengujian user interface"
      ]
    },
    {
      name: "Siti Anggraini Sulistiowati",
      email: "19231074@bsi.ac.id",
      role: "Backend Developer & Database Engineer",
      icon: Server,
      photo: "/siti_pp.png",
      iconColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      description: "Bertanggung jawab dalam pengembangan logika sistem, pengelolaan database, autentikasi pengguna, serta integrasi data antar modul aplikasi. Fokus utama pada stabilitas sistem, keamanan data, dan performa backend.",
      contributions: [
        "Perancangan database",
        "Pengembangan backend system",
        "Implementasi autentikasi dan hak akses",
        "Integrasi modul aplikasi",
        "Pengelolaan penyimpanan data dan keamanan sistem"
      ]
    }
  ];

  const objectives = [
    "Meningkatkan efisiensi pengelolaan operasional gym",
    "Mengurangi risiko kehilangan dan kesalahan pencatatan data manual",
    "Mempermudah proses manajemen member dan pembayaran",
    "Menyediakan sistem presensi dan monitoring kunjungan gym",
    "Membantu owner dalam melihat laporan bisnis secara real-time",
    "Mendukung pengelolaan aset dan pelaporan kerusakan alat gym secara terstruktur",
    "Memberikan pengalaman administrasi yang lebih modern, cepat, dan terintegrasi"
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header />
        <main className="p-4 sm:p-10 flex-1 overflow-x-hidden space-y-10">
          
          {/* Header section with back button */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6"
          >
            <div className="space-y-1">
              <button 
                onClick={() => router.push("/settings")} 
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#FF5A2C] hover:underline mb-2 transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> {language === 'id' ? "Kembali ke Pengaturan" : "Back to Settings"}
              </button>
              <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">CREDIT & TEAM</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">{language === 'id' ? "INFORMASI TIM PENGEMBANG APLIKASI" : "APPLICATION DEVELOPMENT TEAM INFO"}</p>
            </div>
          </motion.div>

          {/* Banner section with group photo and intro */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card overflow-hidden shadow-2xl relative"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 lg:p-12 items-center">
              {/* Image side */}
              <div className="lg:col-span-5 relative group">
                <div className="absolute inset-0 bg-[#FF5A2C]/20 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-white/15 shadow-2xl relative">
                  <img 
                    src="/syntriad_team.jpg" 
                    alt="SynTriad Team" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 no-invert contrast-[90%] saturate-[90%]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <span className="px-4 py-1.5 bg-[#FF5A2C] text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-orange-500/35">SYNTRIAD TEAM</span>
                  </div>
                </div>
              </div>

              {/* Text side */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#FF5A2C]" />
                  <span className="text-[10px] font-black text-[#FF5A2C] uppercase tracking-widest">ABOUT THE PROJECT</span>
                </div>
                <h2 className="text-3xl font-black text-foreground uppercase heading-font tracking-tight">Areta Sport Fitness</h2>
                <div className="h-1 w-16 bg-[#FF5A2C] rounded-full shadow-[0_0_15px_rgba(255,90,44,0.5)]" />
                <p className="text-gray-300 text-sm font-bold leading-relaxed opacity-90">
                  Tim pengembang aplikasi <span className="text-white">Sistem Informasi Website Areta Sport Fitness</span> yang berfokus pada digitalisasi operasional gym, peningkatan efisiensi administrasi, serta penyediaan informasi bisnis secara real-time bagi pengelola.
                </p>
                <p className="text-gray-400 text-xs font-semibold leading-relaxed opacity-75">
                  Aplikasi ini dikembangkan sebagai solusi atas proses operasional manual yang sebelumnya masih menggunakan pencatatan fisik untuk data member, pembayaran, presensi, hingga pelaporan aset dan alat gym. Dengan sistem ini, seluruh proses dapat dilakukan secara terintegrasi, lebih cepat, aman, dan terdokumentasi dengan baik.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Development Objectives */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 lg:p-12 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-8">
              <Target className="h-5 w-5 text-[#FF5A2C]" />
              <h2 className="text-xl font-black text-foreground heading-font uppercase tracking-tight">{language === 'id' ? "Tujuan Pengembangan Aplikasi" : "Development Objectives"}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {objectives.map((obj, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-2xl glass border border-white/5 hover:border-[#FF5A2C]/20 transition-colors group">
                  <div className="h-8 w-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FF5A2C] font-black text-xs flex-shrink-0 group-hover:scale-110 transition-transform">
                    {i + 1}
                  </div>
                  <p className="text-xs font-bold text-gray-300 leading-relaxed uppercase tracking-wider text-left">{obj}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Team Members Grid */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-[#FF5A2C]" />
              <h2 className="text-2xl font-black text-foreground heading-font uppercase tracking-tight">{language === 'id' ? "Anggota Tim Pengembang" : "Team Members"}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {teamMembers.map((member, i) => {
                const Icon = member.icon;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    whileHover={{ y: -5 }}
                    key={member.name} 
                    className="glass-card p-8 flex flex-col gap-6 relative group border border-white/5 hover:border-white/10 transition-all shadow-xl"
                  >
                    {/* Header profile info */}
                    <div className="flex justify-between items-start">
                      <div className="relative">
                        <div className="h-24 w-24 rounded-2xl border border-white/15 overflow-hidden shadow-xl bg-black/35 relative group-hover:border-[#FF5A2C]/30 transition-colors duration-500">
                          <img 
                            src={member.photo} 
                            alt={member.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 no-invert contrast-[90%] saturate-[90%]"
                          />
                        </div>
                        {/* Role Icon Badge */}
                        <div className={`absolute -bottom-2 -right-2 p-2 rounded-xl border shadow-lg ${member.iconColor} group-hover:scale-110 transition-transform duration-500`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <a href={`mailto:${member.email}`} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title="Send email">
                        <Mail className="h-4 w-4" />
                      </a>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-foreground heading-font uppercase tracking-tight">{member.name}</h3>
                      <p className="text-[9px] font-black text-[#FF5A2C] uppercase tracking-widest leading-none bg-[#FF5A2C]/10 border border-[#FF5A2C]/20 px-3 py-1.5 rounded-lg inline-block">{member.role}</p>
                      <p className="text-[10px] font-bold text-gray-500 lowercase tracking-widest">{member.email}</p>
                    </div>

                    <div className="h-[1px] w-full bg-white/5" />

                    {/* Description */}
                    <div className="space-y-2 flex-1">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">DESCRIPTION</p>
                      <p className="text-gray-300 text-xs font-semibold leading-relaxed opacity-95 text-left">{member.description}</p>
                    </div>

                    <div className="h-[1px] w-full bg-white/5" />

                    {/* Contributions */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">KEY CONTRIBUTIONS</p>
                      <ul className="space-y-2">
                        {member.contributions.map((con, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-left">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A2C] mt-1.5 flex-shrink-0" />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer closing section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-8 lg:p-12 text-center shadow-xl max-w-4xl mx-auto"
          >
            <p className="text-gray-300 text-sm font-bold leading-relaxed max-w-2xl mx-auto">
              Aplikasi <span className="text-white">Sistem Informasi Website Areta Sport Fitness</span> dikembangkan oleh <span className="text-[#FF5A2C] font-black uppercase">SynTriad Team</span> sebagai bentuk implementasi teknologi informasi dalam mendukung transformasi digital pada sektor layanan kebugaran. Diharapkan sistem ini mampu memberikan solusi yang efektif, efisien, dan berkelanjutan bagi pengelolaan operasional gym.
            </p>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-8">
              © 2026 SynTriad Team. All Rights Reserved.
            </p>
          </motion.div>

        </main>
      </div>
    </div>
  );
}
