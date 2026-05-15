"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNotifications } from "@/hooks/useNotifications";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const { requestPermission } = useNotifications();

  // 2 Hours = 120 minutes = 7200 seconds = 7,200,000 milliseconds
  const IDLE_TIMEOUT = 7200000; 

  useEffect(() => {
    setIsMounted(true);
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (!isMounted) return;

    // Strict Firebase Auth Check (Bypass for Developer)
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser && user?.role !== "DEVELOPER") {
        if (user) setUser(null);
        if (pathname !== "/login" && pathname !== "/login/") {
          router.replace("/login");
        }
      } else if (firebaseUser) {
        // If we have a Firebase user but no data in Zustand store (e.g. fresh browser/refresh)
        // Only sync if data is missing to avoid unnecessary calls
        if (!user || (!user.photoUrl && user.photoUrl !== "")) {
          try {
            const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const userData = snap.docs[0].data();
              setUser({
                id: snap.docs[0].id,
                name: userData.name || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
                email: firebaseUser.email || "",
                role: (userData.role || "ADMIN").toUpperCase(),
                initial: (userData.name || firebaseUser.email || "A").charAt(0).toUpperCase(),
                photoUrl: userData.photoUrl || "",
                settings: userData.settings || { emailNotifications: true, maintenanceAlerts: true }
              });
            }
          } catch (error) {
            console.error("Error syncing user profile:", error);
          }
        }

        // Navigation logic
        if (pathname === "/login" || pathname === "/login/" || pathname === "/") {
          router.replace("/dashboard");
        }
      } else if (user?.role === "DEVELOPER") {
        // Fallback for Developer role without Firebase Auth
        // Only sync if photoUrl is completely undefined (not just empty string)
        if (user.photoUrl === undefined) {
          try {
            const q = query(collection(db, "users"), where("email", "==", user.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const userData = snap.docs[0].data();
              setUser({
                ...user,
                photoUrl: userData.photoUrl || "",
                settings: userData.settings || { emailNotifications: true, maintenanceAlerts: true }
              });
            } else {
              // Mark as synced by setting photoUrl to empty string if not found
              setUser({ ...user, photoUrl: "" });
            }
          } catch (error) {
            console.error("Error syncing dev profile:", error);
          }
        }

        if (pathname === "/login" || pathname === "/login/" || pathname === "/") {
          router.replace("/dashboard");
        }
      } else {
        if (pathname !== "/login" && pathname !== "/login/") {
          router.replace("/login");
        }
      }
    });

    return () => unsubscribe();
  }, [user, pathname, isMounted, router, setUser]);

  useEffect(() => {
    if (!isMounted || !user) return;

    let timeoutId: NodeJS.Timeout;

    const logoutUser = async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Error signing out:", error);
      }
      setUser(null);
      alert("Sesi Anda telah berakhir karena tidak ada aktivitas selama 2 jam. Silakan login kembali.");
      router.replace("/login");
    };

    // Check if running in a Mobile App (WebView, Capacitor, Cordova, or PWA)
    const isMobileApp = 
      window.navigator.userAgent.includes('MobileApp') || 
      window.navigator.userAgent.includes('wv') ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Bypass auto-logout if running inside a mobile app
    if (isMobileApp) return;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutUser, IDLE_TIMEOUT);
    };

    // Events that represent user activity
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    // Initialize timer
    resetTimer();

    // Attach event listeners
    events.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user, isMounted, router, setUser]);

  // Prevent flash of unauthenticated content during hydration
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Prevent rendering children if routing is about to happen
  if (!user && pathname !== "/login" && pathname !== "/login/") {
    return null;
  }

  return <>{children}</>;
}
