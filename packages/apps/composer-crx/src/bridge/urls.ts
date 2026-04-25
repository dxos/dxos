//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

export const COMPOSER_URLS_PROP = 'composer-urls';

/**
 * Default list of URL patterns (chrome `match` form) the extension will scan
 * when looking for an open Composer tab. Users can override via the options
 * page.
 */
export const DEFAULT_COMPOSER_URLS = [
  'http://localhost:5173/*',
  'http://localhost:4200/*',
  'https://composer.dxos.org/*',
  'https://labs.composer.space/*',
];

export const getComposerUrls = async (): Promise<string[]> => {
  const stored = await browser.storage.sync.get(COMPOSER_URLS_PROP);
  const value = stored?.[COMPOSER_URLS_PROP];
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return value as string[];
  }
  return DEFAULT_COMPOSER_URLS;
};

export const setComposerUrls = async (urls: string[]): Promise<void> => {
  await browser.storage.sync.set({ [COMPOSER_URLS_PROP]: urls });
};
