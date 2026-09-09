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
 * The glyph for a field with no value set, whatever the field.
 *
 * A dot rather than a dash or an empty cell: every trailing control renders on every row so setting
 * a value never depends on discovering a hover affordance, which means an unset one still has to
 * occupy its column and read as a control. One glyph across priority, estimate and anything added
 * later is what keeps a column of unset rows reading as one column.
 */
export const UNSET_ICON = 'ph--dots-three--regular';

export const priorityIcon = (priority: Task.Priority | undefined): string =>
  priority != null ? (PRIORITY_ICONS.get(priority) ?? UNSET_ICON) : UNSET_ICON;

/**
 * A status's glyph, from the same table that gives it a title and a hue, so the flat row, the tree,
 * the picker and the form's select cannot drift apart.
 */
export const statusIcon = (status: Task.Status): string => STATUS_ICONS.get(status) ?? UNSET_ICON;

/**
 * Hue lookup over a schema option table.
 *
 * Colour comes from the table rather than from a map of our own so a row, its picker and the form's
 * select all paint a value the same way; `getStyles` falls back to neutral for a colour outside the
 * palette (the tables use `gray`, which is not one).
 */
const textStyleFor = <T extends string>(options: readonly Task.Option<any>[]) => {
  const colors = new Map(options.map(({ id, color }) => [id, color]));
  return (id: T | undefined): string => getStyles(colors.get(id as T) ?? 'neutral').text;
};

export const statusTextStyle = textStyleFor(Task.StatusOptions);
export const priorityTextStyle = textStyleFor(Task.PriorityOptions);
export const estimateTextStyle = textStyleFor(Task.EstimateOptions);

/** A priority's glyph, from the same table that gives it a title and a hue. */
const PRIORITY_ICONS = new Map(Task.PriorityOptions.map(({ id, icon }) => [id, icon]));
const STATUS_ICONS = new Map(Task.StatusOptions.map(({ id, icon }) => [id, icon]));
