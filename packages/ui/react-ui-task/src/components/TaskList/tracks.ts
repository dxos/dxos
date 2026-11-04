//
// Copyright 2026 DXOS.org
//

/** A cell on a row's title line. A list's `columns` orders them, and its rows and its create row both follow it. */
export type TaskColumn = 'gutter' | 'priority' | 'status' | 'title' | 'artifacts' | 'estimate' | 'assignee' | 'actions';

/** The project list's order: priority and status ahead of the title, who has it after. */
export const DEFAULT_COLUMNS: readonly TaskColumn[] = [
  'gutter',
  'priority',
  'status',
  'title',
  'artifacts',
  'assignee',
  'actions',
];

/**
 * A cell's place on the list's column template, by track name, on the title line. Shared by the tree's rows and the
 * edit pane, which lay out on the same template, so a field sits exactly where the value it edits is read; a cell
 * that is absent leaves its track empty. Literal so Tailwind finds the classes.
 */
export const TRACK = {
  gutter: 'row-start-1 col-[gutter]',
  priority: 'row-start-1 col-[priority]',
  status: 'row-start-1 col-[status]',
  title: 'row-start-1 col-[title]',
  artifacts: 'row-start-1 col-[artifacts]',
  estimate: 'row-start-1 col-[estimate]',
  assignee: 'row-start-1 col-[assignee]',
  actions: 'row-start-1 col-[actions]',
} as const;

export const spanFromTitle = (cells: readonly TaskColumn[], spanning: readonly TaskColumn[]): string => {
  const end = cells.slice(cells.indexOf('title') + 1).find((cell) => !spanning.includes(cell));
  return end ? `title / ${end}` : 'title / -1';
};
