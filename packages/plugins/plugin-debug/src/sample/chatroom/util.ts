//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

/** Stable reference date so regenerations are reproducible. Override with NOW=2026-05-20 env. */
export const REFERENCE = process.env.NOW ? new Date(process.env.NOW) : new Date('2026-05-20T15:00:00Z');

/**
 * Bound to the same reference the definition declares, so the pure content builders can date their
 * objects without every one of them being an effect.
 */
export const clock = SampleSpace.makeClock(REFERENCE);

export const daysAgo = clock.daysAgo;
