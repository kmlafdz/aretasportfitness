import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
  initial: string;
  photoUrl?: string;
  settings?: {
    emailNotifications: boolean;
    maintenanceAlerts: boolean;
  };
}

interface AuthState {
  user: User | null;
  notificationsEnabled: boolean;
  setUser: (user: User | null) => void;
  toggleNotifications: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      notificationsEnabled: true,
      setUser: (user) => set({ user }),
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
    }),
    {
      name: 'auth-storage',
    }
  )
);
