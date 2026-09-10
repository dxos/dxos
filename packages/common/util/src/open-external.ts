//
// Copyright 2026 DXOS.org
//

import { isTauri } from './platform';

/**
 * Open a URL outside the app: a new tab on the web, the system browser under Tauri, whose webview
 * ignores `window.open` and would otherwise leave the caller believing a link was followed.
 */
export const openExternalUrl = async (url: string): Promise<void> => {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};
