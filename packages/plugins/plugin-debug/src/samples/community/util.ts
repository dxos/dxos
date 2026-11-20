//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

/** The day the Cloudflare crawl ends, so the tasks are filed when the data was fresh. Override with NOW. */
export const REFERENCE = process.env.NOW ? new Date(process.env.NOW) : new Date('2026-11-16T17:00:00Z');

const clock = SampleSpace.makeClock(REFERENCE);

/** ISO timestamp that many days before {@link REFERENCE}. */
export const daysAgo = clock.daysAgo;
