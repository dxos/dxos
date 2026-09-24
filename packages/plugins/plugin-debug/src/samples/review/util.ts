//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

/** Stable reference date so regenerations are reproducible. */
export const REFERENCE = new Date('2026-09-24T15:00:00Z');

export const { daysAgo } = SampleSpace.makeClock(REFERENCE);
