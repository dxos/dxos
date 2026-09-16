//
// Copyright 2022 DXOS.org
//

// Per-locale entry, not `date-fns/locale`: that barrel re-exports every locale (~1MB of
// source) for the one default used here.
import { enUS as dtLocaleEnUs } from 'date-fns/locale/en-US';
import { createContext, useContext } from 'react';
import { useTranslation as useI18NextTranslation } from 'react-i18next';

// Kept out of `TranslationsProvider.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const initialNs = 'dxos-common';
export const initialDtLocale = dtLocaleEnUs;

export const TranslationsContext = createContext({
  appNs: initialNs,
  dtLocale: initialDtLocale,
});

export const useTranslation = (...args: Parameters<typeof useI18NextTranslation>) => {
  const result = useI18NextTranslation(...args);
  const { dtLocale } = useContext(TranslationsContext);
  return { ...result, dtLocale };
};
