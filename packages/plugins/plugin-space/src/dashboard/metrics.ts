//
// Copyright 2026 DXOS.org
//

import { type Progress } from '@dxos/progress';

import { toSlots } from './slots.ts';
import { type MetricSpec, type SpaceStats } from './types.ts';

const ACTIVE: readonly Progress.TaskStatus[] = ['pending', 'running'];

const STAT_LABELS: readonly [keyof SpaceStats, string][] = [
  ['objects', 'Objects'],
  ['feeds', 'Feeds'],
  ['types', 'Types'],
  ['plugins', 'Plugins'],
];

const toProgressMetric = (task: Progress.TaskProgress): MetricSpec => ({
  kind: 'progress',
  title: task.label ?? task.name,
  // Clamped both ways: a task reporting a negative current would emit a ratio outside [0, 1].
  ratio: task.total && task.total > 0 ? Math.max(0, Math.min(1, task.current / task.total)) : undefined,
  detail: task.total ? `${task.current}/${task.total}` : String(task.current),
});

/**
 * Projects the progress registry onto a fixed number of slots, falling back to space stats when
 * nothing is running — the display is never blank, and an active task always wins over the counts.
 *
 * Pure, so both modes and the transition between them are testable without a device.
 */
export const toMetrics = (
  tasks: readonly Progress.TaskProgress[],
  stats: SpaceStats,
  slots: number,
): (MetricSpec | null)[] => {
  const active = tasks.filter((task) => ACTIVE.includes(task.status));
  const specs: MetricSpec[] = active.length
    ? active.slice(0, slots).map(toProgressMetric)
    : STAT_LABELS.map(([key, title]) => ({ kind: 'stat', title, value: String(stats[key]) }));

  return toSlots(specs, slots);
};
