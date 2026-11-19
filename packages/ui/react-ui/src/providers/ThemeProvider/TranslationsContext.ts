//
// Copyright 2022 DXOS.org
//

// Per-locale entry, not `date-fns/locale`: that barrel re-exports every locale (~1MB of
// source) for the one default used here.
import { enUS as dtLocaleEnUs } from 'date-fns/locale/en-US';
import { type i18n as I18n } from 'i18next';
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
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
  const version = useResourceVersion(result.i18n);
  // A fresh `t` per version, since compiled components memoize what they render on its identity.
  const t = useMemo(() => result.t.bind(undefined), [result.t, version]);
  const { dtLocale } = useContext(TranslationsContext);
  return { ...result, t, dtLocale };
};

/**
 * Changes when bundles are added. Plugins add theirs as they activate, often after first render,
 * and react-i18next only listens from an effect, so it misses a bundle added before that effect runs.
 */
const useResourceVersion = (i18n: I18n | undefined): number => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      i18n?.store?.on('added', onChange);
      return () => i18n?.store?.off('added', onChange);
    },
    [i18n],
  );
  // An instance that was never initialised has no store.
  const getSnapshot = () => (i18n?.store ? resourceVersion(i18n) : 0);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

const versions = new WeakMap<I18n, { value: number }>();

const resourceVersion = (i18n: I18n): number => {
  let version = versions.get(i18n);
  if (!version) {
    const counter = { value: 0 };
    i18n.store.on('added', () => counter.value++);
    versions.set(i18n, counter);
    version = counter;
  }
  return version.value;
};
