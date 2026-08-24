//
// Copyright 2026 DXOS.org
//

import { type Progress } from '@dxos/progress';

/**
 * What a {@link ProgressMeter} renders — the runtime's own task model, not a mirror of it.
 *
 * Aliased rather than redeclared so a producer and this component cannot drift: the meter reads the
 * same shape the registry writes, and a story drives it with a literal of that shape.
 */
export type ProgressState = Progress.TaskProgress;
export type ProgressStatus = Progress.TaskStatus;
