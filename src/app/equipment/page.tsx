"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Edit, Trash, Dumbbell, Loader2, X, Image as ImageIcon, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { SuccessModal } from "@/components/ui/success-modal";

export default function EquipmentPage() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [equipment, setEquipment] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "" });
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "Cardio",
    condition: "Good",
    age: 0,
    lastMaintenance: new Date().toISOString().split("T")[0],
    photoUrl: ""
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    const q = query(collection(db, "equipment"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setEquipment(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredData = equipment.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalPhotoUrl = formData.photoUrl;
      if (selectedFile) {
        setIsUploading(true);
        const uploadedUrl = await uploadToCloudinary(selectedFile);
        if (uploadedUrl) finalPhotoUrl = uploadedUrl;
        setIsUploading(false);
      }

      const dataToSave = {
        name: formData.name,
        category: formData.category,
        condition: formData.condition,
        age: Number(formData.age),
        lastMaintenance: formData.lastMaintenance,
        photoUrl: finalPhotoUrl
      };

      if (editingId) {
        await updateDoc(doc(db, "equipment", editingId), dataToSave);
      } else {
        const equipId = `EQ-${Math.floor(1000 + Math.random() * 9000)}`;
        await addDoc(collection(db, "equipment"), { ...dataToSave, equipId, created_at: serverTimestamp() });
      }
      handleCloseModal();
      setSuccessModalOpen(true);
    } catch (error: any) { alert(t.failed); } finally { setIsSubmitting(false); setIsUploading(false); }
  };

  const handleEditClick = (item: any) => {
    setFormData({
      name: item.name || "",
      category: item.category || "Cardio",
      condition: item.condition || "Good",
      age: item.age || 0,
      lastMaintenance: item.lastMaintenance || new Date().toISOString().split("T")[0],
      photoUrl: item.photoUrl || ""
    });
    setPreviewUrl(item.photoUrl || "");
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setFormData({ name: "", category: "Cardio", condition: "Good", age: 0, lastMaintenance: new Date().toISOString().split("T")[0], photoUrl: "" });
    setSelectedFile(null);
    setPreviewUrl("");
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "equipment", deleteModal.id));
      setDeleteModal({ isOpen: false, id: "" });
      handleCloseModal();
    } catch (error) { alert(t.failed); }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header />
        <main className="p-4 sm:p-10 flex-1 overflow-x-hidden space-y-10">
          
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">{language === 'id' ? "ALAT" : "EQUIPMENT"}</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">{language === 'id' ? "INVENTARIS & ASET PEMELIHARAAN" : "INVENTORY & MAINTENANCE ASSETS"}</p>
            </div>
            <Button onClick={() => { setEditingId(null); setFormData({ name: "", category: "Cardio", condition: "Good", age: 0, lastMaintenance: new Date().toISOString().split("T")[0], photoUrl: "" }); setPreviewUrl(""); setIsModalOpen(true); }} className="bg-gradient-to-br from-[#FF5A2C] to-red-600 hover:brightness-110 text-white rounded-2xl px-8 py-6 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95">
              <Plus className="h-4 w-4 mr-2" /> {language === 'id' ? "TAMBAH ALAT" : "ADD EQUIPMENT"}
            </Button>
          </motion.div>

          <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#FF5A2C] transition-colors" />
              <Input placeholder={t.search} className="pl-14 h-14 bg-black/5 border-none text-foreground placeholder:text-gray-600 w-full focus-visible:ring-1 focus-visible:ring-[#FF5A2C]/30 rounded-2xl font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
            {isLoading ? (
              <div className="col-span-full py-20 text-center"><Loader2 className="h-8 w-8 text-[#FF5A2C] animate-spin mx-auto" /></div>
            ) : filteredData.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-500 font-black tracking-widest text-[10px] uppercase border-2 border-dashed border-white/5 rounded-[2rem]">No data found.</div>
            ) : (
              filteredData.map((item) => (
                <motion.div 
                  key={item.id}
                  whileHover={{ y: -5 }}
                  onClick={() => handleEditClick(item)}
                  className="glass-card p-4 flex flex-col items-center text-center group cursor-pointer border border-white/5 hover:border-[#FF5A2C]/30 transition-all shadow-xl"
                >
                  <div className="relative w-full aspect-square rounded-2xl glass overflow-hidden mb-4 border border-white/10 shadow-inner">
                    {item.photoUrl ? (
                      <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover no-invert group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700 bg-black/10">
                        <Dumbbell className="h-10 w-10 opacity-20" />
                      </div>
                    )}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tighter border shadow-lg ${item.condition === "Good" ? "bg-teal-500 text-white border-teal-400" : item.condition === "Critical" ? "bg-red-500 text-white border-red-400" : "bg-orange-500 text-white border-orange-400"}`}>
                      {item.condition === "Good" ? (language === 'id' ? "BAIK" : "GOOD") : item.condition === "Critical" ? (language === 'id' ? "KRITIS" : "CRITICAL") : (language === 'id' ? "WARN" : "WARN")}
                    </div>
                  </div>
                  <h3 className="font-black text-foreground heading-font tracking-wide uppercase text-xs sm:text-sm line-clamp-1">{item.name}</h3>
                  <p className="text-[9px] text-gray-500 font-black tracking-widest uppercase mt-1 opacity-60">{item.equipId}</p>
                  
                  <div className="mt-4 w-full pt-4 border-t border-white/5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-black text-[#FF5A2C] uppercase tracking-widest">Detail Alat</span>
                    <ArrowUpRight className="h-3 w-3 text-[#FF5A2C]" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg glass-card p-6 sm:p-10 shadow-2xl border border-white/10 my-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground heading-font uppercase tracking-tight">{editingId ? (language === 'id' ? "DETAIL & EDIT" : "DETAIL & EDIT") : (language === 'id' ? "TAMBAH ALAT" : "ADD ASSET")}</h2>
                  {editingId && <p className="text-[10px] font-black text-[#FF5A2C] uppercase tracking-[0.2em] mt-1">ID: {equipment.find(e => e.id === editingId)?.equipId}</p>}
                </div>
                <button onClick={handleCloseModal} className="p-2 text-gray-500 hover:text-foreground transition-colors"><X className="h-6 w-6" /></button>
              </div>
              
              <form onSubmit={handleSubmitEquipment} className="space-y-8">
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  <div className="relative h-40 w-full sm:w-40 rounded-3xl glass border border-white/10 flex items-center justify-center overflow-hidden group cursor-pointer shrink-0 shadow-2xl" onClick={() => fileInputRef.current?.click()}>
                    {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover no-invert" /> : (
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="h-8 w-8 text-gray-600" />
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{language === 'id' ? "UPLOAD FOTO" : "UPLOAD PHOTO"}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase">{language === 'id' ? 'GANTI FOTO' : 'CHANGE PHOTO'}</div>
                    {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="h-8 w-8 text-white animate-spin" /></div>}
                  </div>
                  
                  <div className="flex-1 space-y-6 w-full">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">{language === 'id' ? "NAMA ALAT" : "ASSET NAME"}</label>
                       <Input required className="h-12 bg-black/20 border-white/5 rounded-xl font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="..." />
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">{language === 'id' ? "KATEGORI" : "CATEGORY"}</label>
                          <select className="flex h-12 w-full rounded-xl border border-white/5 bg-black/20 px-4 text-sm font-bold text-foreground appearance-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                            <option value="Cardio" className="bg-background">CARDIO</option>
                            <option value="Strength" className="bg-background">STRENGTH</option>
                            <option value="Free Weights" className="bg-background">WEIGHTS</option>
                          </select>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">{language === 'id' ? "KONDISI" : "CONDITION"}</label>
                      <select className="flex h-12 w-full rounded-xl border border-white/5 bg-black/20 px-4 text-sm font-bold text-foreground appearance-none" value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})}>
                        <option value="Good" className="bg-background">GOOD</option>
                        <option value="Warning" className="bg-background">WARNING</option>
                        <option value="Critical" className="bg-background">CRITICAL</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">{language === 'id' ? "UMUR (TAHUN)" : "AGE (YEARS)"}</label>
                      <Input type="number" required className="h-12 bg-black/20 border-white/5 rounded-xl font-bold" value={formData.age} onChange={(e) => setFormData({...formData, age: Number(e.target.value)})} />
                   </div>
                </div>

                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

                <div className="flex gap-4 pt-4 border-t border-white/5">
                  {editingId && (
                    <Button type="button" onClick={() => handleDelete(editingId)} className="h-14 px-6 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 font-black uppercase rounded-2xl transition-all">
                      <Trash className="h-5 w-5" />
                    </Button>
                  )}
                  <Button type="submit" className="flex-1 h-14 bg-[#FF5A2C] text-white font-black uppercase rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50" disabled={isSubmitting || isUploading}>
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (editingId ? (language === 'id' ? "SIMPAN PERUBAHAN" : "SAVE CHANGES") : (language === 'id' ? "TAMBAH ALAT" : "ADD ASSET"))}
                  </Button>
                </div>
              </form>
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
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title={language === 'id' ? "Berhasil" : "Success"}
        message={language === 'id' ? "Data alat fitness telah berhasil disimpan." : "Equipment data has been successfully saved."}
      />
    </div>
  );
}
