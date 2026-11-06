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
export const STATUS_ORDER: Task.Status[] = Task.StatusOptions.map(({ id }) => id);

/**
 * The glyph for a field with no value set, unless the field has a placeholder of its own.
 *
 * A glyph rather than a dash or an empty cell: every trailing control renders on every row so setting
 * a value never depends on discovering a hover affordance, which means an unset one still has to
 * occupy its column and read as a control. One glyph across fields is what keeps a column of unset rows
 * reading as one column; priority and estimate have their own placeholders.
 */
export const UNSET_ICON = 'ph--asterisk--regular';

/** An unset estimate's glyph: a quiet mark, since the column's values are short text rather than icons. */
export const ESTIMATE_UNSET_ICON = 'ph--dot--regular';

export const ESTIMATE_ICON = 'ph--ruler--regular';

/** Unset priority draws the high bars in a neutral tone, so an empty control still reads as the priority ramp. */
const PRIORITY_PLACEHOLDER: Task.Priority = 'high';

export const priorityIcon = (priority: Task.Priority | undefined): string =>
  PRIORITY_ICONS.get(priority ?? PRIORITY_PLACEHOLDER) ?? UNSET_ICON;

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
