/**
 * ECoR-AMP · Global Zustand Store
 * Manages sidebar state, auth, theme, and font size with localStorage persistence.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const applyPreferences = (theme, fontSize) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Apply Theme
  let isDark = false;
  if (theme === 'dark') {
    isDark = true;
  } else if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  // Apply Font Size
  root.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
  root.classList.add(`text-size-${fontSize || 'medium'}`);
  if (fontSize === 'small') {
    root.style.fontSize = '13px';
  } else if (fontSize === 'large') {
    root.style.fontSize = '16px';
  } else {
    root.style.fontSize = '14px';
  }
};

const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Sidebar State ──────────────────────────────────
      isCollapsed: false,
      toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setSidebarCollapsed: (value) => set({ isCollapsed: value }),

      // ── Auth State ─────────────────────────────────────
      token: null,
      role: null,
      fullName: null,
      empId: null,

      login: ({ token, role, fullName, empId }) =>
        set({ token, role, fullName, empId }),

      logout: () => {
        set({ token: null, role: null, fullName: null, empId: null });
        localStorage.removeItem('ecor_token');
        localStorage.removeItem('ecor_role');
        localStorage.removeItem('ecor_name');
      },

      isAuthenticated: () => !!get().token,

      isAdmin: () => get().role === 'it_admin' || get().role === 'admin',
      isCustodian: () => get().role === 'custodian',
      isAuditor: () => get().role === 'auditor',
      canWrite: () => get().role !== 'auditor',

      // ── Preferences State (Theme & Font Size) ──────────
      theme: 'light', // 'light' | 'dark' | 'system'
      fontSize: 'medium', // 'small' | 'medium' | 'large'

      setTheme: (theme) => {
        set({ theme });
        applyPreferences(theme, get().fontSize);
      },

      setFontSize: (fontSize) => {
        set({ fontSize });
        applyPreferences(get().theme, fontSize);
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
    }),
    {
      name: 'ecor-amp-store',
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        token: state.token,
        role: state.role,
        fullName: state.fullName,
        empId: state.empId,
        theme: state.theme,
        fontSize: state.fontSize,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyPreferences(state.theme, state.fontSize);
        }
      },
    }
  )
);

export default useAppStore;
