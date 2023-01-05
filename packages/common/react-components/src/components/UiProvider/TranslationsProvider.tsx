//
// Copyright 2022 DXOS.org
//

import i18Next, { Resource } from 'i18next';
import React, { PropsWithChildren, ReactNode, Suspense, useEffect, createContext } from 'react';
import { initReactI18next, useTranslation } from 'react-i18next';

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

const TranslationsProviderLoaded = ({ children }: PropsWithChildren<{}>) => {
  const { t: _t } = useTranslation(initialNs);
  return <>{children}</>;
};

export const TranslationsContext = createContext({
  appNs: initialNs
});

export const TranslationsProvider = ({ fallback, resourceExtensions, children, appNs }: TranslationsProviderProps) => {
  useEffect(() => {
    if (resourceExtensions && resourceExtensions.length) {
      resourceExtensions.forEach((resource) => {
        Object.keys(resource).forEach((language) => {
          Object.keys(resource[language]).forEach((ns) => {
            i18Next.addResourceBundle(language, ns, resource[language][ns]);
          });
        });
      });
    }
  }, [resourceExtensions]);
  return (
    <TranslationsContext.Provider value={{ appNs: appNs ?? initialNs }}>
      <Suspense fallback={fallback ?? <Loading label={resources[initialLng][initialNs]['loading translations']} />}>
        <TranslationsProviderLoaded>{children}</TranslationsProviderLoaded>
      </Suspense>
    </TranslationsContext.Provider>
  );
};
