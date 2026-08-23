//
// Copyright 2026 DXOS.org
//

import { Progress } from '@dxos/progress';
import { type ProgressState } from '@dxos/react-ui-components';

export { ProgressMeter, type ProgressMeterProps, formatDuration } from '@dxos/react-ui-components';

/**
 * Maps a registry task onto the presentational model.
 *
 * The seam between the two, and the only place the runtime's task model is named — `ProgressMeter`
 * itself lives in `react-ui-components` and knows nothing about a progress registry, which is what
 * lets a story or a scripted value drive it. This is a function rather than a wrapper component on
 * purpose: a passthrough component has to forward every DOM prop its host slot injects, and the one
 * that stood here dropped `data-slot`, which put the meter in an implicit grid row instead of the
 * statusbar.
 *
 * The ETA is derived here too: `deriveEta` falls back to a linear projection from the task's own
 * elapsed time, which is knowledge about how the registry measures, not about how to draw a meter.
 */
export const toProgressState = (task: Progress.TaskProgress): ProgressState => ({
  label: task.label ?? task.name,
  status: task.status,
  current: task.current,
  total: task.total,
  phases: task.phases,
  phase: task.phase,
  note: task.note,
  error: task.error,
  startedAt: task.startedAt,
  elapsedMs: task.elapsedMs,
  etaMs: Progress.deriveEta(task),
  cancellable: task.cancellable,
});
