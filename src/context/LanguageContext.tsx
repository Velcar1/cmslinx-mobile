import { createContext, useContext, useState, useEffect } from 'react';
import { translations, type Language } from '../locales/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'es',
    setLanguage: () => {},
    t: (path: string) => path,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('linx_language');
        return (saved === 'en' || saved === 'es') ? saved : 'es';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('linx_language', lang);
    };

    const t = (path: string): string => {
        const keys = path.split('.');
        let current: any = translations[language];

        for (const key of keys) {
            if (current[key] === undefined) {
                // Fallback to Spanish if something is missing in English
                if (language === 'en') {
                    let fallback: any = translations['es'];
                    for (const fKey of keys) {
                        if (fallback[fKey] === undefined) return path;
                        fallback = fallback[fKey];
                    }
                    return fallback;
                }
                return path;
            }
            current = current[key];
        }

        return current;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
