'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export type LabTheme = {
  laboratoryId: string | null;
  laboratoryName: string;
  code: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  isLoading: boolean;
};

const defaults: Omit<LabTheme, 'isLoading'> = {
  laboratoryId: null,
  laboratoryName: 'PNG Department of Works | Central Materials Laboratory',
  code: 'CML-POM',
  logoUrl: null,
  primaryColor: '#1E3A8A',
  secondaryColor: '#0D9488',
};

const ThemeContext = createContext<LabTheme>({ ...defaults, isLoading: false });

export function LabThemeProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const [theme, setTheme] = useState<LabTheme>({ ...defaults, isLoading: false });

  useEffect(() => {
    const labId = user?.laboratoryId;
    if (!labId) {
      setTheme({ ...defaults, isLoading: false });
      return;
    }
    let active = true;
    setTheme((current) => ({ ...current, laboratoryId: labId, isLoading: true }));
    api.get(`/laboratories/${labId}`)
      .then((res) => {
        if (!active) return;
        const lab = res.data.data;
        setTheme({
          laboratoryId: labId,
          laboratoryName: lab.name || defaults.laboratoryName,
          code: lab.code || defaults.code,
          logoUrl: null,
          primaryColor: defaults.primaryColor,
          secondaryColor: defaults.secondaryColor,
          isLoading: false,
        });
      })
      .catch(() => {
        if (active) setTheme({ ...defaults, laboratoryId: labId, isLoading: false });
      });
    return () => { active = false; };
  }, [user?.laboratoryId]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useLabTheme = () => useContext(ThemeContext);
