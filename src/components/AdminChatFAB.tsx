import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Maximize2, Send, Loader2, User } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDocs } from "firebase/firestore";

const APP_TAGS = [
  { label: "Dashboard", path: "/dashboard", icon: "📊" },
  { label: "Members", path: "/members", icon: "👥" },
  { label: "Equipment", path: "/equipment", icon: "🏋️" },
  { label: "Reports", path: "/reports", icon: "📈" },
  { label: "Scanner", path: "/scanner", icon: "🔍" },
  { label: "Transactions", path: "/transactions", icon: "💰" },
  { label: "SPK", path: "/spk", icon: "🔧" },
  { label: "Settings", path: "/settings", icon: "⚙️" },
  { label: "Chat", path: "/chat", icon: "💬" },
];

export function AdminChatFAB() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);
  const [filteredTags, setFilteredTags] = useState(APP_TAGS);
  const [filteredMembers, setFilteredMembers] = useState<{id: string, nama: string}[]>([]);
  const [allMembers, setAllMembers] = useState<{id: string, nama: string}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || pathname.startsWith("/chat")) return;

    const q = query(collection(db, "chats"), orderBy("created_at", "asc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, pathname]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "members"), orderBy("nama", "asc"));
    getDocs(q).then(snap => {
      setAllMembers(snap.docs.map(d => ({ id: d.id, nama: d.data().nama })));
    });
  }, [user]);

  const handleInputChange = (val: string) => {
    setNewMessage(val);
    const lastWord = val.split(" ").pop() || "";
    
    if (lastWord.startsWith("#")) {
      const search = lastWord.slice(1).toLowerCase();
      setFilteredTags(APP_TAGS.filter(tag => tag.label.toLowerCase().includes(search)));
      setShowTagSuggestions(true);
      setShowMemberSuggestions(false);
    } else if (lastWord.startsWith("@")) {
      const search = lastWord.slice(1).toLowerCase();
      setFilteredMembers(allMembers.filter(m => m.nama.toLowerCase().includes(search)).slice(0, 5));
      setShowMemberSuggestions(true);
      setShowTagSuggestions(false);
    } else {
      setShowTagSuggestions(false);
      setShowMemberSuggestions(false);
    }
  };

  const applyTag = (tag: typeof APP_TAGS[0]) => {
    const words = newMessage.split(" ");
    words.pop();
    setNewMessage([...words, `#${tag.label} `].join(" "));
    setShowTagSuggestions(false);
  };

  const applyMemberTag = (member: {id: string, nama: string}) => {
    const words = newMessage.split(" ");
    words.pop();
    setNewMessage([...words, `@${member.nama.replace(/\s/g, "_")} `].join(" "));
    setShowMemberSuggestions(false);
  };

  const renderContentWithTags = (content: string, isMe: boolean) => {
    if (!content) return null;
    const parts = content.split(/(#[a-zA-Z]+|@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        const tagName = part.slice(1);
        const tag = APP_TAGS.find(t => t.label.toLowerCase() === tagName.toLowerCase());
        if (tag) {
          return (
            <button
              key={i}
              onClick={() => router.push(tag.path)}
              className={cn(
                "inline-flex items-center gap-1 px-1 py-0.5 rounded-md font-black transition-all mx-0.5 whitespace-nowrap",
                isMe 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-[#FF5A2C]/10 text-[#FF5A2C] hover:bg-[#FF5A2C]/20"
              )}
            >
              <span className="text-[8px]">{tag.icon}</span>
              <span className="text-[9px] uppercase tracking-tighter">{tag.label}</span>
            </button>
          );
        }
      } else if (part.startsWith("@")) {
        const memberName = part.slice(1).replace(/_/g, " ");
        return (
          <button
            key={i}
            onClick={() => router.push(`/members?search=${encodeURIComponent(memberName)}`)}
            className={cn(
              "inline-flex items-center gap-1 px-1 py-0.5 rounded-md font-black transition-all mx-0.5 whitespace-nowrap",
              isMe 
                ? "bg-white/20 text-white hover:bg-white/30" 
                : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            )}
          >
            <span className="text-[8px]">👤</span>
            <span className="text-[9px] uppercase tracking-tighter">{memberName}</span>
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const content = newMessage;
    setNewMessage("");
    try {
      await addDoc(collection(db, "chats"), {
        sender_id: user.email || user.name,
        sender_name: user.name,
        sender_role: user.role,
        content: content,
        created_at: serverTimestamp(),
        sender_photo: user.photoUrl || ""
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (pathname === "/login" || pathname.startsWith("/chat") || !user) return null;

  return (
    <>
      {/* FAB BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-40 bg-white/10 backdrop-blur-2xl border border-white/20 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center group active:scale-95 overflow-hidden"
      >
        <div className="relative">
          <MessageSquare className="h-6 w-6 text-blue-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1a1d2e] animate-pulse" />
        </div>
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 ease-in-out font-black text-[10px] uppercase tracking-widest group-hover:ml-3 group-hover:mr-1">
          Admin Chat
        </span>
      </button>

      {/* FLOATING CHAT WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            className="fixed bottom-40 right-6 z-[100] w-[90vw] sm:w-[400px] h-[500px] glass-dark rounded-[2.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Admin Chat</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Online Now</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/chat")}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                  title="Expand to full page"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20"
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <p className="text-[8px] font-black uppercase tracking-widest">Loading chats...</p>
                </div>
              ) : messages.map((msg, idx) => {
                const isMe = msg.sender_id === (user.email || user.name);
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn("flex flex-col max-w-[80%]", isMe ? "items-end" : "items-start")}>
                      {!isMe && (
                        <span className="text-[8px] font-black text-gray-500 mb-1 uppercase tracking-widest ml-2">
                          {msg.sender_name}
                        </span>
                      )}
                      <div className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-lg",
                        isMe 
                          ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none" 
                          : "glass border border-white/5 text-foreground rounded-tl-none"
                      )}>
                        {renderContentWithTags(msg.content, isMe)}
                      </div>
                      <span className="text-[7px] font-bold text-gray-600 mt-1 uppercase tracking-widest px-2">
                        {msg.created_at ? format(msg.created_at.toDate(), "HH:mm") : "..."}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="p-4 bg-white/5 border-t border-white/5 relative">
              {/* TAG SUGGESTIONS */}
              <AnimatePresence>
                {(showTagSuggestions && filteredTags.length > 0) || (showMemberSuggestions && filteredMembers.length > 0) ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-4 right-4 mb-4 glass-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[110]"
                  >
                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                      {showTagSuggestions ? filteredTags.map((tag) => (
                        <button
                          key={tag.label}
                          onClick={() => applyTag(tag)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left transition-all"
                        >
                          <span className="text-sm">{tag.icon}</span>
                          <span className="text-[10px] font-black text-foreground uppercase tracking-tight">{tag.label}</span>
                        </button>
                      )) : filteredMembers.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => applyMemberTag(m)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left transition-all"
                        >
                          <span className="text-sm">👤</span>
                          <span className="text-[10px] font-black text-foreground uppercase tracking-tight">{m.nama}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Type # or @ to tag..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-foreground focus:outline-none focus:border-blue-500/50 font-bold"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 transition-all"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
