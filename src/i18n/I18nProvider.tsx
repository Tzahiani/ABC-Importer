import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type Locale,
  type TranslationKey,
  t as translate,
  ti as interpolate,
} from "./translations";

const STORAGE_KEY = "abc-muse-app-locale-v1";

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "he" || raw === "en") return raw;
  } catch {
    /* ignore */
  }
  return "he";
}

function applyDocumentLocale(locale: Locale) {
  const html = document.documentElement;
  html.lang = locale === "he" ? "he" : "en";
  html.dir = locale === "he" ? "rtl" : "ltr";
}

export type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey) => string;
  ti: (key: TranslationKey, vars: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyDocumentLocale(next);
  }, []);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "he" ? "en" : "he");
  }, [locale, setLocale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t: (key) => translate(locale, key),
      ti: (key, vars) => interpolate(locale, key, vars),
    }),
    [locale, setLocale, toggleLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
