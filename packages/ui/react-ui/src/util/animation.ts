//
// Copyright 2026 DXOS.org
//

import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const matchReducedMotion = (): MediaQueryList | undefined =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION_QUERY)
    : undefined;

const subscribeReducedMotion = (onChange: () => void): (() => void) => {
  const query = matchReducedMotion();
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
};

const getReducedMotionSnapshot = (): boolean => matchReducedMotion()?.matches ?? false;

/** Tracks the reader's `prefers-reduced-motion` setting, re-rendering when they change it. */
export const useReducedMotion = (): boolean =>
  useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);

/**
 * `VITE_DX_DISABLE_ANIMATIONS=true` turns off animation that runs without a user gesture —
 * carousel auto-advance and the like.
 *
 * Agent-driven recordings (`recording-demos`) are culled by dropping runs of identical frames, and
 * an unattended animation makes every frame differ, so the whole session survives the cull.
 */
export const animationsDisabled = (): boolean => {
  // `import.meta.env` is absent outside a Vite graph (plain node, a tsc-built consumer).
  const value = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_DX_DISABLE_ANIMATIONS;
  return value === 'true' || value === '1';
};
