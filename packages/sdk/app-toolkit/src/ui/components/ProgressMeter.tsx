//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Progress } from '@dxos/progress';
import { type ThemedClassName, composable } from '@dxos/react-ui';
import { ProgressMeter as NaturalProgressMeter, type ProgressState } from '@dxos/react-ui-components';

export type ProgressMeterProps = ThemedClassName<{
  state: Progress.TaskProgress;
  /** When provided (and the task is active + cancellable), a cancel control invokes this. */
  onCancel?: () => void;
}>;

/**
 * A registry task, rendered.
 *
 * The presentation lives in `react-ui-components`, which knows nothing about a progress registry — this is the
 * seam between the two, and the only place the runtime's task model is named. Keeping the adapter
 * here is what lets a story or a scripted value drive the same component.
 */
export const ProgressMeter = composable<HTMLDivElement, ProgressMeterProps>(
  ({ state, onCancel, className, classNames }, forwardedRef) => (
    <NaturalProgressMeter
      // `className` is what a host slot injects at runtime (`Panel.Statusbar asChild`); the
      // presentational component owns the DOM node, so it is merged into its `classNames` rather
      // than applied here — there is no element of our own to put it on.
      classNames={[className, classNames]}
      state={toProgressState(state)}
      onCancel={onCancel}
      ref={forwardedRef}
    />
  ),
);

ProgressMeter.displayName = 'ProgressMeter';

/**
 * Maps a registry task onto the presentational model. The ETA is derived here rather than in the
 * component: `deriveEta` falls back to a linear projection from the task's own elapsed time, which is
 * knowledge about how the registry measures, not about how to draw a meter.
 */
const toProgressState = (task: Progress.TaskProgress): ProgressState => ({
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
