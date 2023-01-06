//
// Copyright 2022 DXOS.org
//

import i18Next, { Resource } from 'i18next';
import React, { PropsWithChildren, ReactNode, Suspense, useEffect, createContext, useContext } from 'react';
import { initReactI18next, useTranslation } from 'react-i18next';

import { Loading } from '@dxos/react-ui';

import * as enUS from './locales/en-US';

const basicNS = 'uikit';

export const resources = {
  'en-US': enUS
} as const;

void i18Next.use(initReactI18next).init({
  resources,
  lng: 'en-US',
  defaultNS: basicNS,
  interpolation: {
    escapeValue: false
  }
});

export interface TranslationsProviderProps {
  children?: ReactNode;
  fallback?: ReactNode;
  // TODO: rename this to resources
  resourceExtensions?: Resource[];
  appNs?: string;
}

const TranslationsProviderLoaded = ({ children }: PropsWithChildren<{}>) => {
  const { t: _t } = useTranslation(basicNS);
  return <>{children}</>;
};

export const TranslationsContext = createContext({
  appNs: basicNS
});

export const useTranslationsContext = () => useContext(TranslationsContext);

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
    <TranslationsContext.Provider value={{ appNs: appNs ?? basicNS }}>
      <Suspense fallback={fallback ?? <Loading label={enUS[basicNS]['loading translations']} />}>
        <TranslationsProviderLoaded>{children}</TranslationsProviderLoaded>
      </Suspense>
    </TranslationsContext.Provider>
  );
};
