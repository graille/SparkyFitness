import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';

const LANGUAGE_STORAGE_KEY = '@Language:selectedLanguage';

export { SUPPORTED_LANGUAGES };
export type { SupportedLanguage };

export async function loadStoredLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
      await i18n.changeLanguage(stored as SupportedLanguage);
    }
  } catch {
    // Ignore storage errors — fall back to device locale
  }
}

export async function setLanguage(lng: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lng);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
}

export function useSelectedLanguage(): SupportedLanguage {
  const [language, setLanguageState] = useState<SupportedLanguage>(
    i18n.language as SupportedLanguage,
  );

  useEffect(() => {
    const handler = (lng: string) => {
      setLanguageState(lng as SupportedLanguage);
    };
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, []);

  return language;
}
