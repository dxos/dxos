//
// Copyright 2022 DXOS.org
//

import { type Locale, enUS as dtLocaleEnUs } from 'date-fns/locale';
import i18Next, { type Resource, type TFunction } from 'i18next';
import React, { type ReactNode, Suspense, createContext, useContext, useEffect, useState } from 'react';
import { initReactI18next, useTranslation as useI18NextTranslation } from 'react-i18next';

const initialLng = 'en-US';
const initialNs = 'dxos-common';
const initialDtLocale = dtLocaleEnUs;

// TODO(burdon): Move to @dxos/ui
// TODO(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures.
export type Label = string | [string, { ns: string; count?: number; defaultValue?: string }];

export const isLabel = (o: any): o is Label =>
  typeof o === 'string' ||
  (Array.isArray(o) &&
    o.length === 2 &&
    typeof o[0] === 'string' &&
    !!o[1] &&
    typeof o[1] === 'object' &&
    'ns' in o[1] &&
    typeof o[1].ns === 'string');

export const toLocalizedString = (label: Label, t: TFunction) => (Array.isArray(label) ? t(...label) : label);

export const resources = {
  [initialLng]: {
    [initialNs]: {
      'loading translations': 'Loading translations…',
    },
  },
} as const satisfies Resource;

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
