//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

/**
 * The Monday after the incident, when the retro is written. Stable so regenerations are
 * reproducible; override with NOW=2026-05-18 env.
 */
export const REFERENCE = process.env.NOW ? new Date(process.env.NOW) : new Date('2026-05-18T09:00:00Z');

export const clock = SampleSpace.makeClock(REFERENCE);

/** ISO timestamp that many days before {@link REFERENCE}, at an optional UTC hour of that day. */
export const daysAgo = clock.daysAgo;

/** The people in the notes, as task owners. The names are the only identity a template can give them. */
export const CAST = {
  jae: { role: 'user', name: 'Jae Reyes' },
  priya: { role: 'user', name: 'Priya Nair' },
  dan: { role: 'user', name: 'Dan Walsh' },
  sam: { role: 'user', name: 'Sam Lindqvist' },
} as const;
