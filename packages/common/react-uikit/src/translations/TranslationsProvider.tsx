//
// Copyright 2022 DXOS.org
//

import i18Next, { Resource } from 'i18next';
import React, {
  PropsWithChildren,
  ReactNode,
  Suspense,
  useEffect
} from 'react';
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
  children?: ReactNode
  fallback?: ReactNode
  resourceExtensions?: Resource
}

const TranslationsProviderLoaded = ({ children }: PropsWithChildren<{}>) => {
  const { t: _t } = useTranslation(basicNS);
  return <>{children}</>;
};

export const TranslationsProvider = ({
  fallback,
  resourceExtensions,
  children
}: TranslationsProviderProps) => {
  useEffect(() => {
    if (resourceExtensions) {
      Object.keys(resourceExtensions).forEach((language) => {
        Object.keys(resourceExtensions[language]).forEach((ns) => {
          i18Next.addResourceBundle(language, ns, resourceExtensions[language][ns]);
        });
      });
    }
  }, [resourceExtensions]);
  return (
    <Suspense
      fallback={
        fallback ?? (
          <Loading label={enUS[basicNS]['loading translations']} />
        )
      }
    >
      <TranslationsProviderLoaded>{children}</TranslationsProviderLoaded>
    </Suspense>
  );
};
