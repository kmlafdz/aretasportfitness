"use client";

import { useEffect, useState } from "react";
import { messaging } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { Capacitor } from "@capacitor/core";

export function useFcm() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (!messaging) return;

    const setupFcm = async () => {
      try {
        // Only request token if on web or supported environment
        if (!Capacitor.isNativePlatform()) {
          const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
          });
          
          if (token) {
            setFcmToken(token);
            console.log("FCM Token:", token);
          }
        }
      } catch (error) {
        console.error("FCM Setup Error:", error);
      }
    };

    setupFcm();

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground Message:", payload);
      // You can trigger a local notification here if needed
    });

    return () => unsubscribe();
  }, []);

  return { fcmToken };
}
