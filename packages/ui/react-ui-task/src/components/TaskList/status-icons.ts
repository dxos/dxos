//
// Copyright 2026 DXOS.org
//

import { Task } from '@dxos/types';
import { getStyles } from '@dxos/ui-theme';

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

/**
 * One glyph per status, shared by the flat row and the tree so the two cannot drift apart. Shape
 * only — colour comes from {@link statusTextStyle}, so a status is tinted the same here, in its
 * picker and in the form's select.
 */
export const STATUS_ICONS: Record<Task.Status, { icon: string }> = {
  backlog: { icon: 'ph--tray--regular' },
  todo: { icon: 'ph--square--regular' },
  blocked: { icon: 'ph--prohibit--regular' },
  started: { icon: 'ph--hourglass--regular' },
  review: { icon: 'ph--eye--regular' },
  done: { icon: 'ph--check--regular' },
  failed: { icon: 'ph--x--regular' },
  cancelled: { icon: 'ph--x--regular' },
  duplicate: { icon: 'ph--copy--regular' },
};

/**
 * Hue lookup over a schema option table.
 *
 * Colour comes from the table rather than from a map of our own so a row, its picker and the form's
 * select all paint a value the same way; `getStyles` falls back to neutral for a colour outside the
 * palette (the tables use `gray`, which is not one).
 */
const textStyleFor = <T extends string>(options: readonly { id: T; color: string }[]) => {
  const colors = new Map(options.map(({ id, color }) => [id, color]));
  return (id: T | undefined): string => getStyles(colors.get(id as T) ?? 'neutral').text;
};

export const statusTextStyle = textStyleFor(Task.StatusOptions);
export const priorityTextStyle = textStyleFor(Task.PriorityOptions);
export const estimateTextStyle = textStyleFor(Task.EstimateOptions);
