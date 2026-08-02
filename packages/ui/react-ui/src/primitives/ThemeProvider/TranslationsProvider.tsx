//
// Copyright 2022 DXOS.org
//

// Per-locale entry, not `date-fns/locale`: that barrel re-exports every locale (~1MB of
// source) for the one default used here.
import { type Locale } from 'date-fns';
import { enUS as dtLocaleEnUs } from 'date-fns/locale/en-US';
import React, { type ReactNode, Suspense, createContext, useContext, useEffect, useState } from 'react';
import { I18nextProvider, useTranslation as useI18NextTranslation } from 'react-i18next';

import { type Resource, addResources, i18n } from '@dxos/i18n';

const initialNs = 'dxos-common';
const initialDtLocale = dtLocaleEnUs;

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
    // Convenience for standalone/storybook callers; the i18next instance lifecycle is owned by `@dxos/i18n`.
    if (resourceExtensions && resourceExtensions.length) {
      addResources(resourceExtensions);
    }

    setLoaded(true);
  }, [resourceExtensions]);

  // TODO(thure): This is not ideal, but i18next was causing `Suspense` to not render the fallback even when the child was asking for namespaces yet to be added.
  // TODO(burdon): Fallbacks should only appear after a short delay, and if the displayed then be visible for 500mx to avoid startup flickering.
  return (
    <I18nextProvider i18n={i18n}>
      <TranslationsContext.Provider value={{ appNs: appNs ?? initialNs, dtLocale: dtLocale ?? initialDtLocale }}>
        <Suspense fallback={fallback}>{loaded ? children : fallback}</Suspense>
      </TranslationsContext.Provider>
    </I18nextProvider>
  );
};
