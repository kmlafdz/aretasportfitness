"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Trash, X, Shield, ShieldAlert, Loader2, Mail } from "lucide-react";
import { db, firebaseConfig, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, where, getDocs, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { SuccessModal } from "@/components/ui/success-modal";

export default function UsersPage() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "" });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "Admin"
  });

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setUsers(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (formData.role === "Owner") {
        const ownerQ = query(collection(db, "users"), where("role", "==", "Owner"));
        const ownerSnap = await getDocs(ownerQ);
        if (!ownerSnap.empty) {
          alert(language === 'id' ? "Gagal: Maksimal 1 Owner!" : "Failed: Maximum 1 Owner!");
          setIsSubmitting(false);
          return;
        }
      }
      const userQ = query(collection(db, "users"), where("username", "==", formData.username));
      const userSnap = await getDocs(userQ);
      if (!userSnap.empty) {
        alert(language === 'id' ? "Gagal: Username sudah digunakan." : "Failed: Username already taken.");
        setIsSubmitting(false);
        return;
      }

      const secondaryAppName = "SecondaryApp-" + new Date().getTime();
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      await sendEmailVerification(userCred.user);
      setTimeout(async () => await signOut(secondaryAuth), 1000);

      await addDoc(collection(db, "users"), {
        uid: userCred.user.uid,
        name: formData.name,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        status: "Pending Verification",
        lastLogin: "Never",
        created_at: serverTimestamp()
      });

      setFormData({ name: "", username: "", email: "", password: "", role: "Admin" });
      setIsModalOpen(false);
      setSuccessModal({
        isOpen: true,
        title: language === 'id' ? "Pendaftaran Berhasil" : "Staff Created",
        message: language === 'id' ? "Email verifikasi telah dikirim ke " + formData.email : "Verification email has been sent to " + formData.email
      });
    } catch (error: any) { alert(t.failed + ": " + error.message); } finally { setIsSubmitting(false); }
  };

  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [resendTarget, setResendTarget] = useState({ email: "", id: "" });
  const [resendPassword, setResendPassword] = useState("");
  const [isResending, setIsResending] = useState(false);

  const openResendModal = (email: string, id: string) => {
    setResendTarget({ email, id });
    setResendPassword("");
    setResendModalOpen(true);
  };

  const handleResendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResending(true);
    try {
      const secondaryAppName = "SecondaryResend-" + new Date().getTime();
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      const userCred = await signInWithEmailAndPassword(secondaryAuth, resendTarget.email, resendPassword);
      await sendEmailVerification(userCred.user);
      setTimeout(async () => await signOut(secondaryAuth), 1000);
      setResendModalOpen(false);
      setSuccessModal({
        isOpen: true,
        title: language === 'id' ? "Verifikasi Terkirim" : "Verification Resent",
        message: language === 'id' ? "Email verifikasi telah dikirim ulang ke " + resendTarget.email : "Verification email has been resent to " + resendTarget.email
      });
    } catch (error: any) { alert(t.failed + ": " + error.message); } finally { setIsResending(false); }
  };

  const handleDelete = (id: string, role: string) => {
    if (role === "Owner") return alert(language === 'id' ? "Owner tidak bisa dihapus." : "Owner cannot be deleted.");
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      const userRef = doc(db, "users", deleteModal.id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const uid = userData.uid;

        if (uid) {
          // Get current logged-in admin's Firebase ID token
          const idToken = await auth.currentUser?.getIdToken();

          // Call the backend API route to delete auth credentials and firestore doc
          const response = await fetch("/api/users/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": idToken ? `Bearer ${idToken}` : "",
            },
            body: JSON.stringify({ uid, docId: deleteModal.id }),
          });

          if (!response.ok) {
            const resData = await response.json();
            console.warn("Delete API returned error, falling back to client-side delete:", resData.error);
            await deleteDoc(userRef);
          } else {
            const resData = await response.json();
            if (!resData.firestoreDeleted) {
              await deleteDoc(userRef);
            }
          }
        } else {
          // Fallback if user doesn't have uid
          await deleteDoc(userRef);
        }
      } else {
        await deleteDoc(userRef);
      }

      setDeleteModal({ isOpen: false, id: "" });
      setSuccessModal({
        isOpen: true,
        title: language === 'id' ? "Berhasil Dihapus" : "Successfully Deleted",
        message: language === 'id' ? "Pengguna dan kredensial berhasil dihapus." : "User and credentials successfully deleted."
      });
    } catch (error: any) { 
      alert(t.failed + ": " + (error.message || "")); 
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header />
        <main className="p-4 sm:p-10 flex-1 overflow-x-hidden space-y-10">
          
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">{language === 'id' ? "PENGGUNA" : "USERS"}</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">{language === 'id' ? "KONTROL AKSES & MANAJEMEN STAF" : "ACCESS CONTROL & STAFF MANAGEMENT"}</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-br from-[#FF5A2C] to-red-600 hover:brightness-110 text-white rounded-2xl px-8 py-6 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95">
              <Plus className="h-4 w-4 mr-2" /> {language === 'id' ? "TAMBAH PENGGUNA" : "ADD NEW USER"}
            </Button>
          </motion.div>

          <div className="glass-card overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="relative w-full max-w-sm group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#FF5A2C] transition-colors" />
                <Input placeholder={t.search} className="pl-14 h-14 bg-black/5 border-none text-foreground placeholder:text-gray-600 w-full focus-visible:ring-1 focus-visible:ring-[#FF5A2C]/30 rounded-2xl font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-black/10 border-b border-white/5">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">{language === 'id' ? "IDENTITAS" : "IDENTITY"}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">USERNAME</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-center">{language === 'id' ? "HAK AKSES" : "PRIVILEGES"}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-center">STATUS</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase text-right">{t.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-8 py-20 text-center"><Loader2 className="h-8 w-8 text-[#FF5A2C] animate-spin mx-auto" /></td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-black tracking-widest text-[10px] uppercase">No data found.</td></tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl glass border border-white/10 flex items-center justify-center text-[#FF5A2C] font-black heading-font text-lg shadow-lg uppercase">
                              {user.name ? user.name.charAt(0) : "U"}
                            </div>
                            <div>
                              <p className="font-black text-foreground heading-font uppercase tracking-wide">{user.name}</p>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-bold text-gray-500 tracking-wider">@{user.username}</td>
                        <td className="px-8 py-6 text-center">
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 bg-white/5 text-foreground">
                            {user.role === "Owner" ? <ShieldAlert className="h-3.5 w-3.5 text-orange-500" /> : <Shield className="h-3.5 w-3.5 text-blue-400" />}
                            {user.role}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${user.status === "Pending Verification" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-teal-500/10 text-teal-500 border-teal-500/20"}`}>
                            {user.status === "Pending Verification" ? (language === 'id' ? "PENDING" : "PENDING") : (language === 'id' ? "TERVERIFIKASI" : "VERIFIED")}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                             {user.status === "Pending Verification" && (
                               <button onClick={() => openResendModal(user.email, user.id)} className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-xl transition-all"><Mail className="h-[18px] w-[18px]" /></button>
                             )}
                             <button onClick={() => handleDelete(user.id, user.role)} disabled={user.role === "Owner"} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-20"><Trash className="h-[18px] w-[18px]" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md glass-card p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-foreground heading-font uppercase tracking-tight">{t.add} {language === 'id' ? "STAF" : "STAFF"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500"><X className="h-6 w-6" /></button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">{t.name}</label>
                   <Input required className="h-12 bg-black/20 border-white/5 rounded-xl font-bold text-foreground" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="..." />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Username</label>
                   <Input required className="h-12 bg-black/20 border-white/5 rounded-xl font-bold text-foreground" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="..." />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Email</label>
                   <Input required type="email" className="h-12 bg-black/20 border-white/5 rounded-xl font-bold text-foreground" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="..." />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Password</label>
                   <Input required type="password" minLength={6} className="h-12 bg-black/20 border-white/5 rounded-xl font-bold text-foreground" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">{language === 'id' ? "PERAN" : "ROLE"}</label>
                   <select className="flex h-12 w-full rounded-xl border border-white/5 bg-black/20 px-4 text-sm font-bold text-foreground appearance-none" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                     <option value="Admin" className="bg-background">ADMIN</option>
                     <option value="Owner" className="bg-background">OWNER</option>
                   </select>
                </div>
                <Button type="submit" className="w-full h-14 bg-[#FF5A2C] text-white font-black uppercase rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : t.save}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resendModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm glass-card p-8">
              <h2 className="text-xl font-black text-foreground heading-font uppercase mb-4">{language === 'id' ? "KIRIM ULANG VERIFIKASI" : "RESEND VERIFICATION"}</h2>
              <form onSubmit={handleResendSubmit} className="space-y-6">
                <Input required type="password" px-4 className="h-12 bg-black/20 border-white/5 rounded-xl font-bold text-foreground" value={resendPassword} onChange={(e) => setResendPassword(e.target.value)} placeholder="..." />
                <Button type="submit" className="w-full h-14 bg-yellow-600 text-white font-black uppercase rounded-2xl" disabled={isResending}>
                  {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'id' ? "KIRIM SEKARANG" : "RESEND NOW")}
                </Button>
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
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        title={successModal.title}
        message={successModal.message}
      />
    </div>
  );
}
