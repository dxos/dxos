//
// Copyright 2025 DXOS.org
//

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Formats elapsed milliseconds as a human-readable duration.
 * Tiers: `Ns` (< 60s), `Nm Xs` (< 60m), `Nh Xm` (≥ 60m).
 * Negative inputs clamp to `0s`.
 */
export const formatElapsed = (ms: number): string => {
  const safe = Math.max(0, ms);
  if (safe < MINUTE) {
    return `${Math.floor(safe / SECOND)}s`;
  }
  if (safe < HOUR) {
    const m = Math.floor(safe / MINUTE);
    const s = Math.floor((safe % MINUTE) / SECOND);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(safe / HOUR);
  const m = Math.floor((safe % HOUR) / MINUTE);
  return `${h}h ${m}m`;
};
