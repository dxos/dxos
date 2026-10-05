//
// Copyright 2026 DXOS.org
//

import { type ExtraScale } from '@dxos/perf-harness/score';

/**
 * The busy space, scored into the same `chat` suite as the blank one: its budgets in `budgets.json`
 * are prefixed `busy > ` and roll up into one group, so a busy regression moves the Chat score.
 */
export const BUSY_SCALE: ExtraScale = { scale: 'busy', prefix: 'busy', group: 'busy space' };
