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

const toProgressDial = (task: Progress.TaskProgress): DialSpec => ({
  kind: 'progress',
  title: task.label ?? task.name,
  ratio: task.total && task.total > 0 ? Math.min(1, task.current / task.total) : undefined,
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
