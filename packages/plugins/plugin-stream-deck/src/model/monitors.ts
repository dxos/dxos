//
// Copyright 2026 DXOS.org
//

import { type Progress } from '@dxos/progress';

import { type DialSpec, type SpaceStats } from './types';

const ACTIVE: readonly Progress.TaskStatus[] = ['pending', 'running'];

const STAT_LABELS: readonly [keyof SpaceStats, string][] = [
  ['objects', 'Objects'],
  ['feeds', 'Feeds'],
  ['types', 'Types'],
  ['plugins', 'Plugins'],
];

/**
 * A producer is free to report a negative, overshooting or non-finite `current`; the dial promises a
 * fraction in `[0, 1]`, and a non-finite value would serialize to `null` and fail the wire decode.
 */
const clampRatio = (ratio: number): number | undefined =>
  Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : undefined;

const toProgressDial = (task: Progress.TaskProgress): DialSpec => ({
  kind: 'progress',
  title: task.label ?? task.name,
  ratio: task.total && task.total > 0 ? clampRatio(task.current / task.total) : undefined,
  detail: task.total ? `${task.current}/${task.total}` : String(task.current),
});

/**
 * Projects the progress registry onto the touch strip, falling back to space stats when nothing is
 * running — the strip is never blank, and an active task always wins over the counts.
 *
 * Pure, so both modes and the transition between them are testable without a device.
 */
export const toDialSpecs = (
  tasks: readonly Progress.TaskProgress[],
  stats: SpaceStats,
  dials: number,
): (DialSpec | null)[] => {
  const active = tasks.filter((task) => ACTIVE.includes(task.status));
  const specs: DialSpec[] = active.length
    ? active.slice(0, dials).map(toProgressDial)
    : STAT_LABELS.map(([key, title]) => ({ kind: 'stat', title, value: String(stats[key]) }));

  return Array.from({ length: dials }, (_, index) => specs[index] ?? null);
};
