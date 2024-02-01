//
// Copyright 2022 DXOS.org
//

import { enUS as dtLocaleEnUs, type Locale } from 'date-fns/locale';
import i18Next, { type Resource } from 'i18next';
import React, { type ReactNode, useEffect, createContext, useState, Suspense, useContext } from 'react';
import { initReactI18next, useTranslation as useI18NextTranslation } from 'react-i18next';

const initialLng = 'en-US';
const initialNs = 'dxos-common';
const initialDtLocale = dtLocaleEnUs;

export const resources = {
  [initialLng]: {
    [initialNs]: {
      'loading translations': 'Loading translations…',
    },
  },
} as const;

void i18Next.use(initReactI18next).init({
  resources,
  lng: initialLng,
  defaultNS: initialNs,
  interpolation: {
    escapeValue: false,
  },
});

export interface TranslationsProviderProps {
  children?: ReactNode;
  // TODO(wittjosiah): Rename to `placeholder` to match ClientProvider?
  //   Placeholder => loading, fallback => error.
  fallback?: ReactNode;
  resourceExtensions?: Resource[];
  appNs?: string;
  dtLocale?: Locale;
}

export const TranslationsContext = createContext({
  appNs: initialNs,
  dtLocale: initialDtLocale,
});

export const useTranslation = (...args: Parameters<typeof useI18NextTranslation>) => {
  const result = useI18NextTranslation(...args);
  const { dtLocale } = useContext(TranslationsContext);
  return { ...result, dtLocale };
};

export const TranslationsProvider = ({
  fallback,
  resourceExtensions,
  children,
  appNs,
  dtLocale,
}: TranslationsProviderProps) => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
    if (resourceExtensions && resourceExtensions.length) {
      resourceExtensions.forEach((resource) => {
        Object.keys(resource).forEach((language) => {
          Object.keys(resource[language]).forEach((ns) => {
            i18Next.addResourceBundle(language, ns, resource[language][ns]);
          });
        });
      });
    }
    setLoaded(true);
  }, [resourceExtensions]);

  // TODO(thure): This is not ideal, but i18next was causing `Suspense` to not render the fallback even when the child was asking for namespaces yet to be added.
  // TODO(burdon): Fallbacks should only appear after a short delay, and if the displayed then be visible for 500mx to avoid startup flickering.
  return (
    <TranslationsContext.Provider value={{ appNs: appNs ?? initialNs, dtLocale: dtLocale ?? initialDtLocale }}>
      <Suspense fallback={fallback}>{loaded ? children : fallback}</Suspense>
    </TranslationsContext.Provider>
  );
};
