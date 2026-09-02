//
// Copyright 2026 DXOS.org
//

import { Task } from '@dxos/types';

/**
 * Every status, most active first — the order the picker offers and the order groups render in.
 *
 * It must stay exhaustive: `buildStatusGroups` renders only the statuses named here, so a status
 * left off this list would take its tasks out of a grouped view entirely rather than merely sorting
 * them late.
 */
export const STATUS_ORDER: Task.Status[] = [
  'started',
  'review',
  'blocked',
  'todo',
  'backlog',
  'done',
  'failed',
  'cancelled',
  'duplicate',
];

/** One glyph per status, shared by the flat row and the tree so the two cannot drift apart. */
export const STATUS_ICONS: Record<Task.Status, { icon: string; classNames?: string }> = {
  backlog: { icon: 'ph--tray--regular', classNames: 'text-subdued' },
  todo: { icon: 'ph--square--regular', classNames: 'text-subdued' },
  blocked: { icon: 'ph--prohibit--regular', classNames: 'text-warning-text' },
  started: { icon: 'ph--hourglass--regular', classNames: 'text-info-text' },
  review: { icon: 'ph--eye--regular', classNames: 'text-info-text' },
  done: { icon: 'ph--check--regular', classNames: 'text-success-text' },
  failed: { icon: 'ph--x--regular', classNames: 'text-error-text' },
  cancelled: { icon: 'ph--x--regular', classNames: 'text-error-text' },
  duplicate: { icon: 'ph--copy--regular', classNames: 'text-subdued' },
};
