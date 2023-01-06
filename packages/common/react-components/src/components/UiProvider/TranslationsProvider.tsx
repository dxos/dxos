//
// Copyright 2022 DXOS.org
//

import i18Next, { Resource } from 'i18next';
import React, { ReactNode, useEffect, createContext, useState, Suspense } from 'react';
import { initReactI18next } from 'react-i18next';

import { Loading } from '../Loading';

const initialLng = 'en-US';
const initialNs = 'dxos-common';

export const resources = {
  [initialLng]: {
    [initialNs]: {
      'loading translations': 'Loading translations…'
    }
  }
} as const;

void i18Next.use(initReactI18next).init({
  resources,
  lng: initialLng,
  defaultNS: initialNs,
  interpolation: {
    escapeValue: false
  }
});

export interface TranslationsProviderProps {
  children?: ReactNode;
  fallback?: ReactNode;
  resourceExtensions?: Resource[];
  appNs?: string;
}

export const TranslationsContext = createContext({
  appNs: initialNs
});

export const TranslationsProvider = ({
  fallback = <Loading label={resources[initialLng][initialNs]['loading translations']} />,
  resourceExtensions,
  children,
  appNs
}: TranslationsProviderProps) => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
    if (resourceExtensions && resourceExtensions.length) {
      resourceExtensions.forEach((resource) => {
        Object.keys(resource).forEach((language) => {
          Object.keys(resource[language]).forEach((ns) => {
            console.log('[adding]', language, ns, resource[language][ns]);
            i18Next.addResourceBundle(language, ns, resource[language][ns]);
          });
        });
      });
    }
    setLoaded(true);
  }, [resourceExtensions]);

  // todo(thure): This is not ideal, but i18next was causing `Suspense` to not render the fallback even when the child was asking for namespaces yet to be added.
  return (
    <TranslationsContext.Provider value={{ appNs: appNs ?? initialNs }}>
      <Suspense fallback={fallback}>{loaded ? children : fallback}</Suspense>
    </TranslationsContext.Provider>
  );
};
