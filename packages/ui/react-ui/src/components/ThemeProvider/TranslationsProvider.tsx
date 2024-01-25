//
// Copyright 2022 DXOS.org
//

import i18Next, { type Resource } from 'i18next';
import React, { type ReactNode, useEffect, createContext, useState, Suspense } from 'react';
import { initReactI18next } from 'react-i18next';

const initialLng = 'en-US';
const initialNs = 'dxos-common';

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
}

export const TranslationsContext = createContext({
  appNs: initialNs,
});

export const TranslationsProvider = ({ fallback, resourceExtensions, children, appNs }: TranslationsProviderProps) => {
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
    <TranslationsContext.Provider value={{ appNs: appNs ?? initialNs }}>
      <Suspense fallback={fallback}>{loaded ? children : fallback}</Suspense>
    </TranslationsContext.Provider>
  );
};
