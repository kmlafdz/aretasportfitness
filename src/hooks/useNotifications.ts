"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export function useNotifications() {
  const { notificationsEnabled } = useAuthStore();

  const requestPermission = useCallback(async () => {
    console.log("requestPermission called");
    if (Capacitor.isNativePlatform()) {
      try {
        console.log("Capacitor: Requesting permissions...");
        const status = await LocalNotifications.requestPermissions();
        console.log("Capacitor permission status:", status);
        return status.display;
      } catch (e) {
        console.error("Capacitor permission request failed:", e);
        return "denied";
      }
    }

    if (typeof window === "undefined" || !("Notification" in window)) return "denied";
    if (Notification.permission === "default") {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  }, []);

  const sendNotification = useCallback(async (title: string, options?: NotificationOptions & { tag?: string }) => {
    console.log("sendNotification called:", title, options);
    if (!notificationsEnabled) {
      console.log("Notifications are disabled in settings");
      return;
    }

    // 1. In-Browser Toast (Always show for immediate feedback)
    toast(title, {
      description: options?.body,
      duration: 5000,
    });

    // 2. Native Notification
    if (Capacitor.isNativePlatform()) {
      try {
        const isGranted = await LocalNotifications.checkPermissions();
        console.log("Capacitor checkPermissions:", isGranted);

        if (isGranted.display === 'granted') {
          console.log("Scheduling local notification...");
          await LocalNotifications.schedule({
            notifications: [
              {
                title,
                body: options?.body || "",
                id: Math.floor(Math.random() * 1000000),
                schedule: { at: new Date(Date.now() + 100) },
                sound: undefined,
                attachments: undefined,
                actionTypeId: "",
                extra: null,
              },
            ],
          });
        } else {
          console.log("Permission not granted, requesting...");
          const req = await LocalNotifications.requestPermissions();
          if (req.display === 'granted') {
             // Retry once
             await LocalNotifications.schedule({
               notifications: [{
                 title, body: options?.body || "", id: 1, schedule: { at: new Date(Date.now() + 100) }
               }]
             });
          }
        }
      } catch (e) {
        console.error("Native notification failed:", e);
      }
      return;
    }

    // 3. System/Browser Notification Fallback
    if (typeof window === "undefined" || !("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
      try {
        new Notification(title, {
          icon: "/logo.png",
          ...options
        });
      } catch (e) {
        console.error("Failed to show system notification:", e);
      }
    }
  }, [notificationsEnabled]);

  const sendPushNotification = useCallback(async (payload: { title: string; body: string; topic?: string; userIds?: string[]; data?: any }) => {
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response from API:", text);
        return { success: false, error: "Server returned non-JSON response" };
      }
    } catch (error) {
      console.error("Error calling push notification API:", error);
      return { success: false, error };
    }
  }, []);

  return { requestPermission, sendNotification, sendPushNotification };
}

