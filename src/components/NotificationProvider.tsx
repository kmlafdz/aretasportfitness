"use client";

import { useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotifications } from "@/hooks/useNotifications";
import { usePathname } from "next/navigation";
import { useFcm } from "@/hooks/useFcm";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, notificationsEnabled } = useAuthStore();
  const { sendNotification, sendPushNotification } = useNotifications();
  const pathname = usePathname();
  useFcm(); // Initialize FCM and request permissions
  
  const pathnameRef = useRef(pathname);
  const lastMsgIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!user || !notificationsEnabled) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. GLOBAL CHAT LISTENER
    // We use limit(1) to always get the latest message
    const chatQuery = query(
      collection(db, "chats"),
      orderBy("created_at", "desc"),
      limit(1)
    );

    const unsubChat = onSnapshot(chatQuery, (snapshot) => {
      if (snapshot.empty) return;

      const latestDoc = snapshot.docs[0];
      const msgId = latestDoc.id;
      const msgData = latestDoc.data();

      // Case: Initial Load
      if (isInitialLoadRef.current) {
        lastMsgIdRef.current = msgId;
        isInitialLoadRef.current = false;
        return;
      }

      // Case: New Message Detected
      if (msgId !== lastMsgIdRef.current) {
        lastMsgIdRef.current = msgId;
        
        const myId = user.email || user.name;
        
        // Notify only if:
        // 1. Message is from someone else
        // 2. We are NOT currently on the Chat page OR the window is blurred (optional)
        if (msgData.sender_id !== myId && pathnameRef.current !== "/chat") {
          sendNotification(`Pesan Baru: ${msgData.sender_name}`, {
            body: msgData.content,
            tag: "chat-msg", // Keeps only one notification on screen/center
          });
        }
      }
    }, (error) => {
      console.error("Global Chat listener error:", error);
    });

    // 2. EXPIRY CHECK LISTENER
    const unsubExpiry = onSnapshot(collection(db, "members"), (snapshot) => {
      const expiringSoonCount = snapshot.docs.filter(doc => {
        const data = doc.data();
        if (data.tanggal_expired) {
          const expDate = new Date(data.tanggal_expired);
          expDate.setHours(0,0,0,0);
          const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 3;
        }
        return false;
      }).length;

      if (expiringSoonCount > 0) {
        const notifiedToday = sessionStorage.getItem('expiry_notified_today');
        if (!notifiedToday) {
          sendNotification("Peringatan Membership", {
            body: `${expiringSoonCount} member akan segera expired dalam 3 hari.`,
            tag: "expiry-alert"
          });

          // Trigger Push Notification for the whole team
          sendPushNotification({
            title: "Peringatan Membership",
            body: `${expiringSoonCount} member akan segera expired dalam 3 hari. Segera hubungi mereka!`,
            topic: "staff-chat",
            data: { url: "/dashboard" }
          });

          sessionStorage.setItem('expiry_notified_today', 'true');
        }
      }
    });

    return () => {
      unsubChat();
      unsubExpiry();
    };
  }, [user, notificationsEnabled, sendNotification]);

  return <>{children}</>;
}
