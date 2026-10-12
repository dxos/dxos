//
// Copyright 2026 DXOS.org
//

/** Longest wait between reads after repeated failures. */
const MAX_POLL_MS = 60_000;

/**
 * The wait before the next read: `base` while reads succeed, doubling with each consecutive failure up to a minute,
 * so a panel left open on a space EDGE cannot serve does not ask it every few seconds forever.
 */
export const pollDelay = (base: number, failures: number): number => Math.min(base * 2 ** failures, MAX_POLL_MS);
