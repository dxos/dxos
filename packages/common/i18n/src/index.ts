//
// Copyright 2026 DXOS.org
//

import i18next, { type i18n as I18n, type Resource, type TFunction } from 'i18next';

export type { i18n as I18n, Resource, TFunction } from 'i18next';

const initialLng = 'en-US';
const initialNs = 'dxos-common';

/**
 * Framework-agnostic i18next instance owned outside of React.
 * React binds to this same instance via `<I18nextProvider i18n={i18n}>`; non-React code
 * (operations, services, Effect programs) translates through it directly.
 */
export const i18n: I18n = i18next.createInstance();

void i18n.init({
  lng: initialLng,
  defaultNS: initialNs,
  resources: {
    [initialLng]: {
      [initialNs]: {
        'loading translations': 'Loading translations…',
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
  // Initialize synchronously so non-React consumers can translate immediately after import.
  // Base resources are inline and there is no async backend, so nothing is lost.
  initImmediate: false,
});

/**
 * Translate a key. Bound to {@link i18n} so it stays callable when detached from the instance.
 */
export const t: TFunction = i18n.t.bind(i18n);

/**
 * Register translation resource bundles with the shared instance.
 * Deep-merges and overwrites so repeated or late registration is idempotent.
 */
export const addResources = (resources: readonly Resource[]): void => {
  for (const resource of resources) {
    for (const language of Object.keys(resource)) {
      const languageResource = resource[language];
      for (const ns of Object.keys(languageResource)) {
        i18n.addResourceBundle(language, ns, languageResource[ns], true, true);
      }
    }
  }
};

/**
 * Change the active language. React consumers re-render via the instance's events.
 */
export const changeLanguage = (language: string): Promise<TFunction> => i18n.changeLanguage(language);

/**
 * Subscribe to language changes. Returns an unsubscribe function.
 */
export const onLanguageChanged = (callback: (language: string) => void): (() => void) => {
  i18n.on('languageChanged', callback);
  return () => i18n.off('languageChanged', callback);
};

/**
 * Translation surface exposed to non-React consumers (e.g. via the Translator capability).
 */
export interface Translator {
  readonly i18n: I18n;
  readonly t: TFunction;
  changeLanguage(language: string): Promise<TFunction>;
  onLanguageChanged(callback: (language: string) => void): () => void;
}

export const translator: Translator = {
  i18n,
  t,
  changeLanguage,
  onLanguageChanged,
};
