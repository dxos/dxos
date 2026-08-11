//
// Copyright 2026 DXOS.org
//

import { clearCaches, clearIndexedDB, clearOPFS, clearServiceWorkers } from '@dxos/util';

export type ResetProgress = (message: string) => void;

export type ResetResult = {
  /** False when any storage area failed to clear — callers should not treat the origin as wiped. */
  ok: boolean;
};

/**
 * Wipes all origin storage (same scope as `/reset.html`). Best-effort per storage area: one
 * failure does not stop the others, but it is reported in the result.
 */
export const resetComposerStorage = async (onProgress: ResetProgress): Promise<ResetResult> => {
  let ok = true;
  const attempt = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      onProgress(`${label} cleared`);
    } catch (error) {
      ok = false;
      onProgress(`${label} error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  onProgress('Clearing all storage…');
  await attempt('localStorage', async () => localStorage.clear());
  await attempt('sessionStorage', async () => sessionStorage.clear());

  await attempt('IndexedDB', clearIndexedDB);
  await attempt('OPFS', clearOPFS);
  await attempt('Service workers', clearServiceWorkers);
  await attempt('Caches', clearCaches);

  await attempt('Cookies', async () => {
    document.cookie.split(';').forEach((entry) => {
      const name = entry.trim().split('=')[0];
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  });

  onProgress(ok ? 'Done. Reload / to start fresh.' : 'Completed with errors — storage may not be fully wiped.');
  return { ok };
};
