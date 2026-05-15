import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LanguageState {
  language: 'id' | 'en';
  setLanguage: (lang: 'id' | 'en') => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'id',
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'language-storage',
    }
  )
);
