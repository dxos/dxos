//
// Copyright 2026 DXOS.org
//

/**
 * Shared utilities used by the page-actions registry and invoke modules.
 */

let counter = 0;

/**
 * Generate a unique request id using `crypto.randomUUID` when available,
 * falling back to a monotonic counter prefixed with `pa-`.
 */
export const nextId = (): string => globalThis.crypto?.randomUUID?.() ?? `pa-${(counter += 1)}`;

/**
 * Resolve a promise after `ms` milliseconds.
 */
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
