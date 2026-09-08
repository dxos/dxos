//
// Copyright 2026 DXOS.org
//

/**
 * Key the inline recovery script in `index.html` writes before reloading. Duplicated there as a
 * string literal rather than imported: that script runs before any module loads, which is the whole
 * reason it lives in the HTML — keep the two in sync.
 */
const MARKER = 'dxos.composer.chunk-recovery';

export type ChunkRecovery = {
  /** What failed to load, as reported by whichever handler caught it. */
  reason: string;
  /** When the reload was triggered, epoch ms. */
  at: number;
};

/**
 * Read the marker left by a chunk-recovery reload, if this boot follows one.
 *
 * Does not clear it — see {@link clearChunkRecovery}.
 */
export const readChunkRecovery = (): ChunkRecovery | undefined => {
  try {
    const raw = sessionStorage.getItem(MARKER);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw);
    return typeof parsed?.reason === 'string' && typeof parsed?.at === 'number' ? parsed : undefined;
  } catch {
    // Unavailable or unparseable storage means no recovery to report; the reload already happened.
    return undefined;
  }
};

/**
 * Release the one-reload-per-tab guard.
 *
 * Only safe once a boot has actually succeeded. Clearing it after a failed boot would re-arm the
 * reload for a build that is broken for some other reason, which is the loop the guard exists to
 * prevent.
 */
export const clearChunkRecovery = (): void => {
  try {
    sessionStorage.removeItem(MARKER);
  } catch {
    // Nothing to release if storage is unavailable — the marker was never written either.
  }
};
