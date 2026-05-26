"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Edit, Trash, X, Loader2, RefreshCw, Contact2, Download, Filter, MessageSquare, Calendar, Users } from "lucide-react";
import html2canvas from "html2canvas";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { Member } from "@/types";
import { DigitalCard } from "@/components/DigitalCard";
import { useNotifications } from "@/hooks/useNotifications";
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { SuccessModal } from "@/components/ui/success-modal";
import { useSearchParams } from "next/navigation";

export default function MembersPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || "";
  
  const { language } = useLanguageStore();
  const t = translations[language];
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { sendNotification, sendPushNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "" });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });

  const [formData, setFormData] = useState({
    nama: "",
    nomor_whatsapp: "+62 ",
    alamat: "",
    membership_type: "1 Bulan",
  });

  useEffect(() => {
    const q = query(collection(db, "members"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const membersData: Member[] = [];
      snapshot.forEach((doc) => {
        membersData.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(membersData);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  };

  const formatCurrency = (amt: number) => "Rp " + amt.toLocaleString('id-ID');

  const getDynamicStatus = (expDate: string | Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expDate);
    return exp >= today ? (language === 'id' ? "Aktif" : "Active") : "Expired";
  };

  const processedMembers = members.map(m => ({
    ...m,
    displayStatus: getDynamicStatus(String(m.tanggal_expired))
  }));

  const filteredMembers = processedMembers.filter(m => {
    const matchesSearch = m.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || m.nomor_whatsapp?.includes(searchTerm);
    const matchesStatus = statusFilter === "All Status" || m.displayStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePhoneChange = (val: string) => {
    let clean = val;
    if (!clean.startsWith("+62 ")) clean = "+62 ";
    // Limit to 18 chars (+62 8xx xxxx xxxx)
    if (clean.length > 18) return;
    setFormData({ ...formData, nomor_whatsapp: clean });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const today = new Date();
      const expiredDate = new Date();
      let monthsToAdd = 1;
      let amount = 160000;
      if (formData.membership_type === "3 Bulan") { monthsToAdd = 3; amount = 480000; }
      expiredDate.setMonth(today.getMonth() + monthsToAdd);
      const expString = expiredDate.toISOString().split('T')[0];
      const token = `AR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const docRef = await addDoc(collection(db, "members"), {
        nama: formData.nama,
        nomor_whatsapp: formData.nomor_whatsapp.replace(/\s/g, ''),
        alamat: formData.alamat,
        membership_type: formData.membership_type,
        status: "Active",
        tanggal_daftar: today.toISOString().split('T')[0],
        tanggal_expired: expString,
        qr_token: token,
        created_at: serverTimestamp(),
      });

      await addDoc(collection(db, "transactions"), {
        member: formData.nama,
        type: "New Registration",
        amount: amount,
        method: "Cash",
        status: "Success",
        date: today.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        created_at: serverTimestamp(),
      });

      setIsAddModalOpen(false);
      setFormData({ nama: "", nomor_whatsapp: "+62 ", alamat: "", membership_type: "1 Bulan" });
      setSuccessModal({ 
        isOpen: true, 
        title: language === 'id' ? "Berhasil" : "Success", 
        message: `${formData.nama} berhasil didaftarkan.` 
      });
    } catch (error) { alert(t.failed); } finally { setIsSubmitting(false); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "members", selectedMember.id), {
        nama: formData.nama,
        nomor_whatsapp: formData.nomor_whatsapp.replace(/\s/g, ''),
        alamat: formData.alamat,
      });
      setIsEditModalOpen(false);
      setSelectedMember({ ...selectedMember, nama: formData.nama, nomor_whatsapp: formData.nomor_whatsapp, alamat: formData.alamat });
      setSuccessModal({ 
        isOpen: true, 
        title: language === 'id' ? "Diperbarui" : "Updated", 
        message: "Data member berhasil diperbarui." 
      });
    } catch (error) { alert(t.failed); } finally { setIsSubmitting(false); }
  };

  const confirmRenew = async (months: number) => {
    if (!selectedMember) return;
    try {
      const currentExp = new Date(selectedMember.tanggal_expired);
      const today = new Date();
      const baseDate = currentExp > today ? currentExp : today;
      const amount = months === 1 ? 160000 : 480000;
      
      const newExp = new Date(baseDate);
      newExp.setMonth(newExp.getMonth() + months);
      
      await updateDoc(doc(db, "members", selectedMember.id), { 
        tanggal_expired: newExp.toISOString().split('T')[0], 
        status: "Active" 
      });

      await addDoc(collection(db, "transactions"), {
        member: selectedMember.nama,
        type: "Membership Renewal",
        amount: amount,
        method: "Cash",
        status: "Success",
        date: today.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        created_at: serverTimestamp(),
      });

      setSelectedMember({ ...selectedMember, tanggal_expired: newExp });
      setSuccessModal({ 
        isOpen: true, 
        title: language === 'id' ? "Berhasil" : "Success", 
        message: `Membership ${selectedMember.nama} diperpanjang ${months} bulan.` 
      });
    } catch (e) { alert(t.failed); }
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "members", deleteModal.id));
      setDeleteModal({ isOpen: false, id: "" });
      setSelectedMember(null);
    } catch (e) { alert(t.failed); }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header />
        <main className="p-4 lg:p-10 flex-1 overflow-x-hidden space-y-6 lg:space-y-10">
          
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">{t.members}</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase leading-relaxed">{language === 'id' ? "SISTEM MANAJEMEN" : "MANAGEMENT SYSTEM"}</p>
            </div>
            <Button onClick={() => { setFormData({ nama: "", nomor_whatsapp: "+62 ", alamat: "", membership_type: "1 Bulan" }); setIsAddModalOpen(true); }} className="w-full sm:w-auto bg-gradient-to-br from-[#FF5A2C] to-red-600 hover:brightness-110 text-white rounded-2xl px-6 py-5 sm:px-8 sm:py-6 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95">
              <Plus className="h-4 w-4 mr-2" /> {t.registerMember}
            </Button>
          </motion.div>

          <div className="glass-card p-4 lg:p-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#FF5A2C] transition-colors" />
              <Input placeholder={t.search} className="pl-14 h-12 lg:h-14 bg-black/5 border-none text-foreground placeholder:text-gray-600 w-full focus-visible:ring-1 focus-visible:ring-[#FF5A2C]/30 rounded-2xl font-bold" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="w-full sm:w-auto flex items-center gap-3 bg-black/5 p-2 rounded-2xl">
              <Filter className="h-4 w-4 text-gray-500 ml-2" />
              <select className="bg-transparent border-none text-foreground font-black text-[10px] uppercase tracking-widest h-10 px-4 pr-8 focus:outline-none appearance-none cursor-pointer" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                <option value="All Status" className="bg-background">{language === 'id' ? "SEMUA STATUS" : "ALL STATUS"}</option>
                <option value={language === 'id' ? "Aktif" : "Active"} className="bg-background">{language === 'id' ? "AKTIF" : "ACTIVE"}</option>
                <option value="Expired" className="bg-background">EXPIRED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {isLoading ? (
              <div className="col-span-full py-20 flex justify-center"><Loader2 className="h-10 w-10 text-orange-500 animate-spin" /></div>
            ) : paginatedMembers.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-500 uppercase tracking-widest text-xs font-black">No members found</div>
            ) : (
              paginatedMembers.map((member) => (
                <motion.div 
                  key={member.id}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedMember(member)}
                  className="glass-card p-6 cursor-pointer group transition-all hover:border-orange-500/30 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3">
                    <div className={`h-2 w-2 rounded-full ${member.displayStatus === (language === 'id' ? "Aktif" : "Active") ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                  </div>
                  <div className="space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-orange-500/10 transition-colors">
                      <Contact2 className="h-6 w-6 text-gray-400 group-hover:text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground heading-font uppercase truncate">{member.nama}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-gray-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          EXP: {formatDate(member.tanggal_expired)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mt-10">
             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total: {filteredMembers.length} — Page {currentPage} / {totalPages}</span>
             <div className="flex gap-4">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase disabled:opacity-30">Prev</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase disabled:opacity-30">Next</button>
             </div>
          </div>
        </main>
      </div>

      {/* Member Detail Panel */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedMember(null)}
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-background border-l border-border shadow-2xl h-full flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-orange-500" />
                  </div>
                  <h2 className="text-2xl font-black text-foreground heading-font uppercase">{language === 'id' ? "Detail Member" : "Member Detail"}</h2>
                </div>
                <button onClick={() => setSelectedMember(null)} className="p-3 hover:bg-secondary rounded-2xl transition-all"><X className="h-6 w-6 text-gray-500" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Basic Info */}
                <div className="space-y-6">
                  <div className="glass-card p-6 space-y-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Informasi Utama</p>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Nama Lengkap</p>
                        <p className="text-xl font-black text-foreground heading-font uppercase">{selectedMember.nama}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">WhatsApp</p>
                        <p className="text-lg font-bold text-foreground">{selectedMember.nomor_whatsapp}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Alamat</p>
                        <p className="text-sm font-medium text-gray-400">{selectedMember.alamat || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 space-y-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status Membership</p>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Joined</p>
                        <p className="text-sm font-bold text-foreground uppercase">{formatDate(selectedMember.tanggal_daftar)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Expired</p>
                        <p className="text-sm font-bold text-foreground uppercase">{formatDate(selectedMember.tanggal_expired)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tindakan Cepat</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button onClick={() => confirmRenew(1)} className="h-16 bg-secondary border border-border text-foreground font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-orange-500/10 hover:border-orange-500/30 transition-all">
                      <RefreshCw className="h-4 w-4 mr-2" /> Renew 1 Month
                    </Button>
                    <Button onClick={() => confirmRenew(3)} className="h-16 bg-secondary border border-border text-foreground font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-orange-500/10 hover:border-orange-500/30 transition-all">
                      <RefreshCw className="h-4 w-4 mr-2" /> Renew 3 Months
                    </Button>
                    <Button onClick={() => { setFormData({ nama: selectedMember.nama, nomor_whatsapp: selectedMember.nomor_whatsapp, alamat: selectedMember.alamat || "", membership_type: selectedMember.membership_type || "1 Bulan" }); setIsEditModalOpen(true); }} className="h-16 bg-secondary border border-border text-blue-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-blue-500/10">
                      <Edit className="h-4 w-4 mr-2" /> Edit Profil
                    </Button>
                    <Button onClick={() => { setGeneratedCard({ memberId: selectedMember.id, name: selectedMember.nama, status: getDynamicStatus(selectedMember.tanggal_expired), qrToken: selectedMember.qr_token, expiredAt: selectedMember.tanggal_expired, phone: selectedMember.nomor_whatsapp }); }} className="h-16 bg-secondary border border-border text-teal-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-teal-500/10">
                      <Contact2 className="h-4 w-4 mr-2" /> Digital Card
                    </Button>
                  </div>
                  <Button onClick={() => setDeleteModal({ isOpen: true, id: selectedMember.id })} className="w-full h-14 bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                    <Trash className="h-4 w-4 mr-2" /> Hapus Member
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-[#1a1d2e] p-8 shadow-2xl rounded-[2.5rem] border border-white/10">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black text-white heading-font uppercase">{isEditModalOpen ? t.edit : t.add} MEMBER</h2>
                <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 text-gray-400"><X className="h-6 w-6" /></button>
              </div>
              <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Nama Lengkap</label>
                  <Input required className="h-14 bg-secondary border border-border rounded-2xl text-foreground font-bold" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} placeholder="e.g. Budi Santoso" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">WhatsApp (+62)</label>
                  <Input required className="h-14 bg-secondary border border-border rounded-2xl text-foreground font-bold" value={formData.nomor_whatsapp} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="+62 8..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Alamat</label>
                  <Input required className="h-14 bg-secondary border border-border rounded-2xl text-foreground font-bold" value={formData.alamat} onChange={(e) => setFormData({...formData, alamat: e.target.value})} placeholder="e.g. Jl. Sudirman No. 1" />
                </div>
                {!isEditModalOpen && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Paket Membership</label>
                    <select className="flex h-14 w-full rounded-2xl border border-border bg-secondary px-4 text-sm font-bold text-foreground appearance-none outline-none" value={formData.membership_type} onChange={(e) => setFormData({...formData, membership_type: e.target.value})}>
                      <option value="1 Bulan" className="bg-[#1a1d2e]">1 Month - {formatCurrency(160000)}</option>
                      <option value="3 Bulan" className="bg-[#1a1d2e]">3 Months - {formatCurrency(480000)}</option>
                    </select>
                  </div>
                )}
                <Button type="submit" className="w-full h-16 bg-gradient-to-br from-[#FF5A2C] to-red-600 text-white font-black uppercase rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 mt-4" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (isEditModalOpen ? "SIMPAN PERUBAHAN" : "DAFTARKAN MEMBER")}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Digital Card Preview Modal */}
      <AnimatePresence>
        {generatedCard && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="w-full max-w-md flex flex-col items-center">
              <div className="w-full flex justify-end mb-6"><button onClick={() => setGeneratedCard(null)} className="p-4 bg-white/10 rounded-2xl text-white"><X className="h-6 w-6" /></button></div>
              <div id="digital-card-export" className="w-full relative shadow-2xl rounded-[2rem] overflow-hidden">
                <DigitalCard memberId={generatedCard.memberId} name={generatedCard.name} status={generatedCard.status} qrToken={generatedCard.qrToken} expiredAt={generatedCard.expiredAt} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-10 w-full">
                <Button onClick={async () => {
                   const el = document.getElementById("digital-card-export");
                   if (!el) return;
                   const canvas = await html2canvas(el, { scale: 3, backgroundColor: null });
                   const data = canvas.toDataURL('image/png');
                   
                   if (Capacitor.isNativePlatform()) {
                     try {
                        const fileName = `Areta_Card_${generatedCard.name.replace(/\s+/g, '_')}.png`;
                        const base64 = data.split(',')[1];
                        await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Documents });
                        sendNotification("Success", { body: "Card saved to documents." });
                     } catch (e) { console.error(e); }
                   } else {
                     const link = document.createElement('a');
                     link.download = `Areta_Card_${generatedCard.name}.png`; link.href = data; link.click();
                   }
                }} className="h-16 bg-white/5 border border-white/10 text-white font-black uppercase rounded-2xl"><Download className="h-5 w-5 mr-2" /> SAVE</Button>
                <Button onClick={async () => {
                   let phone = generatedCard.phone;
                   phone = phone.replace(/\D/g, '');
                   if (phone.startsWith("0")) phone = "62" + phone.substring(1);
                   const text = `Halo ${generatedCard.name}, Member Card Areta Fitness Anda siap!\n\nExpired: ${formatDate(generatedCard.expiredAt)}`;
                   window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
                }} className="h-16 bg-[#25D366] text-white font-black uppercase rounded-2xl"><MessageSquare className="h-5 w-5 mr-2" /> SEND WA</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "" })}
        onConfirm={confirmDelete}
      />

      <SuccessModal 
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        title={successModal.title}
        message={successModal.message}
      />
    </div>
  );
}
