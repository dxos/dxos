//
// Copyright 2026 DXOS.org
//

import { clearCaches, clearIndexedDB, clearOPFS, clearServiceWorkers } from '@dxos/util';

export type ResetProgress = (message: string) => void;

/**
 * Wipes all origin storage (same scope as `/reset.html`).
 */
export const resetComposerStorage = async (onProgress: ResetProgress): Promise<void> => {
  const attempt = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      onProgress(`${label} cleared`);
    } catch (error) {
      onProgress(`${label} error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  onProgress('Clearing all storage…');
  localStorage.clear();
  sessionStorage.clear();
  onProgress('localStorage and sessionStorage cleared');

  await attempt('IndexedDB', clearIndexedDB);
  await attempt('OPFS', clearOPFS);
  await attempt('Service workers', clearServiceWorkers);
  await attempt('Caches', clearCaches);

  document.cookie.split(';').forEach((entry) => {
    const name = entry.trim().split('=')[0];
    if (name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  });
  onProgress('Cookies cleared');
  onProgress('Done. Reload / to start fresh.');
};
