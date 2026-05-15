"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, User, Loader2, Paperclip, X, Trash2, Eraser } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDocs, writeBatch } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { format, differenceInMinutes } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import { useNotifications } from "@/hooks/useNotifications";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  sender_photo?: string;
  content: string;
  image_url?: string;
  is_deleted?: boolean;
  created_at: any;
}

export default function ChatPage() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [deleteMsgModal, setDeleteMsgModal] = useState({ isOpen: false, msg: null as ChatMessage | null, type: 'soft' as 'soft' | 'hard' });
  const [clearHistoryModalOpen, setClearHistoryModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("created_at", "asc"), limit(200));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[]);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, previewUrl]);

  const { sendPushNotification } = useNotifications();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user || isSending || isUploading) return;
    setIsSending(true);
    const content = newMessage;
    const file = selectedFile;
    setNewMessage("");
    setSelectedFile(null);
    setPreviewUrl("");
    try {
      let imageUrl = "";
      if (file) {
        setIsUploading(true);
        const uploaded = await uploadToCloudinary(file);
        if (uploaded) imageUrl = uploaded;
        setIsUploading(false);
      }
      await addDoc(collection(db, "chats"), {
        sender_id: user.email || user.name,
        sender_name: user.name,
        sender_role: user.role,
        content: content,
        image_url: imageUrl,
        created_at: serverTimestamp(),
        sender_photo: user.photoUrl || ""
      });

      // Send Push Notification
      await sendPushNotification({
        title: `Pesan baru dari ${user.name}`,
        body: imageUrl ? "[Gambar]" : content,
        topic: "staff-chat",
        data: { url: "/chat" }
      });

    } catch (error: any) { alert(t.failed); } finally { setIsSending(false); setIsUploading(false); }
  };

  const handleDeleteMessage = (msg: ChatMessage) => {
    if (!user) return;
    const isMe = msg.sender_id === (user.email || user.name);
    if (!isMe) return;
    const createdAt = msg.created_at?.toDate() || new Date();
    const minutesDiff = differenceInMinutes(new Date(), createdAt);
    
    if (minutesDiff < 5) {
      setDeleteMsgModal({ isOpen: true, msg, type: 'hard' });
    } else {
      setDeleteMsgModal({ isOpen: true, msg, type: 'soft' });
    }
  };

  const confirmDeleteMessage = async () => {
    const { msg, type } = deleteMsgModal;
    if (!msg) return;
    try {
      if (type === 'hard') {
        await deleteDoc(doc(db, "chats", msg.id));
      } else {
        await updateDoc(doc(db, "chats", msg.id), { 
          is_deleted: true, 
          content: language === 'id' ? "Pesan telah dihapus" : "Message has been deleted", 
          image_url: "" 
        });
      }
      setDeleteMsgModal({ isOpen: false, msg: null, type: 'soft' });
    } catch (e) { alert(t.failed); }
  };

  const handleClearHistory = () => {
    if (user?.role !== "DEVELOPER") return;
    setClearHistoryModalOpen(true);
  };

  const confirmClearHistory = async () => {
    setIsClearing(true);
    try {
      const q = query(collection(db, "chats"));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) { alert(t.failed); } finally { setIsClearing(false); setClearHistoryModalOpen(false); }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 h-screen">
        <Header />
        <main className="flex-1 flex flex-col min-h-0 relative p-4 sm:p-10">
          <div className="flex justify-between items-end mb-8">
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">{t.chat}</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">{language === 'id' ? "RUANG KOMUNIKASI INTERNAL" : "INTERNAL TEAM ROOM"}</p>
            </div>
            {user?.role === "DEVELOPER" && (
              <button onClick={handleClearHistory} disabled={isClearing} className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">
                {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                {language === 'id' ? "HAPUS RIWAYAT" : "CLEAR HISTORY"}
              </button>
            )}
          </div>
          <div className="flex-1 flex flex-col glass-card overflow-hidden relative min-h-0 shadow-2xl">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500"><Loader2 className="h-8 w-8 animate-spin text-[#FF5A2C]" /><p className="text-[10px] font-black uppercase tracking-widest">Syncing...</p></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center"><MessageCircle className="h-10 w-10 text-gray-700" /></div>
                  <h3 className="text-xl font-black text-foreground heading-font uppercase tracking-tight">{language === 'id' ? "Belum ada obrolan" : "No messages yet"}</h3>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg, index) => {
                    const isMe = msg.sender_id === (user?.email || user?.name);
                    const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-4 max-w-[90%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
                          <div className={cn(
                            "w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden transition-all shadow-md",
                            !showAvatar && "opacity-0",
                            msg.sender_role === 'DEVELOPER' 
                              ? "p-[1.5px] bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 ring-1 ring-blue-500/10" 
                              : "glass border border-white/10"
                          )}>
                            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black/20">
                              {msg.sender_photo ? <img src={msg.sender_photo} alt={msg.sender_name} className="w-full h-full object-cover no-invert" /> : <User className="h-5 w-5 text-gray-500" />}
                            </div>
                          </div>
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {showAvatar && (
                              <span className="text-[10px] font-black text-gray-500 mb-2 px-1 flex items-center gap-2 uppercase tracking-widest">
                                {msg.sender_name} 
                                <span className="w-1 h-1 rounded-full bg-[#FF5A2C]/50" /> 
                                <span className={cn(
                                  "font-black",
                                  msg.sender_role === 'DEVELOPER' ? "text-blue-400" : "text-[#FF5A2C]"
                                )}>{msg.sender_role}</span>
                              </span>
                            )}
                            <div className="flex items-center gap-3">
                              {isMe && !msg.is_deleted && <button onClick={() => handleDeleteMessage(msg)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /></button>}
                              <div className={`rounded-3xl shadow-lg overflow-hidden ${msg.is_deleted ? 'bg-white/5 border border-white/5 italic text-gray-500 px-6 py-4' : isMe ? 'bg-gradient-to-br from-[#FF5A2C] to-red-600 text-white rounded-tr-none' : 'glass border border-white/5 text-foreground rounded-tl-none'}`}>
                                {msg.image_url && !msg.is_deleted && <div className="p-1.5"><img src={msg.image_url} alt="..." className="max-w-full sm:max-w-md rounded-2xl cursor-pointer no-invert" onClick={() => window.open(msg.image_url, '_blank')} /></div>}
                                {msg.content && <div className="px-6 py-4 text-sm font-bold leading-relaxed">{msg.content}</div>}
                              </div>
                            </div>
                            <span className="text-[9px] font-black text-gray-500 mt-2 uppercase tracking-widest opacity-60">{msg.created_at ? format(msg.created_at.toDate(), "HH:mm", { locale: language === 'id' ? id : enUS }) : "..."}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
            <div className="p-4 sm:p-8 bg-black/5 border-t border-white/5 pb-[safe-area-inset-bottom]">
              {previewUrl && (
                <div className="mb-4 sm:mb-6 relative inline-block">
                  <div className="relative rounded-3xl overflow-hidden border-2 border-[#FF5A2C]/30 shadow-2xl">
                    <img src={previewUrl} alt="..." className="h-32 sm:h-40 w-auto object-cover no-invert" />
                    <button onClick={() => { setSelectedFile(null); setPreviewUrl(""); }} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full"><X className="h-4 w-4" /></button>
                    {isUploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="h-8 w-8 text-white animate-spin" /></div>}
                  </div>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-4">
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setSelectedFile(file); const r = new FileReader(); r.onloadend = () => setPreviewUrl(r.result as string); r.readAsDataURL(file); } }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 sm:p-4 rounded-2xl glass-dark text-gray-400 border border-white/10 flex-shrink-0"><Paperclip className="h-5 w-5" /></button>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={t.search} className="flex-1 bg-black/20 border border-white/10 rounded-2xl sm:rounded-3xl px-4 sm:px-8 py-3 sm:py-4 text-sm text-foreground focus:outline-none focus:border-[#FF5A2C]/50 font-bold min-w-0" />
                <button type="submit" disabled={(!newMessage.trim() && !selectedFile) || isSending || isUploading} className="bg-gradient-to-br from-[#FF5A2C] to-red-600 text-white p-3 sm:p-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex-shrink-0">
                  {isSending || isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
      <DeleteConfirmModal 
        isOpen={deleteMsgModal.isOpen}
        onClose={() => setDeleteMsgModal({ isOpen: false, msg: null, type: 'soft' })}
        onConfirm={confirmDeleteMessage}
        title={language === 'id' ? "Hapus Pesan" : "Delete Message"}
        message={deleteMsgModal.type === 'hard' 
          ? (language === 'id' ? "Hapus pesan ini secara permanen?" : "Delete this message permanently?")
          : (language === 'id' 
              ? "Pesan sudah lama. Ganti isi pesan menjadi 'Pesan telah dihapus'?" 
              : "Message is old. Replace content with 'Message deleted'?")}
      />

      <DeleteConfirmModal 
        isOpen={clearHistoryModalOpen}
        onClose={() => setClearHistoryModalOpen(false)}
        onConfirm={confirmClearHistory}
        title={language === 'id' ? "KOSONGKAN CHAT" : "CLEAR HISTORY"}
        message={language === 'id' 
          ? "Seluruh riwayat obrolan tim akan dihapus permanen. Lanjutkan?" 
          : "All team chat history will be permanently erased. Proceed?"}
        confirmText={language === 'id' ? "Ya, Kosongkan" : "Yes, Clear"}
      />
    </div>
  );
}
