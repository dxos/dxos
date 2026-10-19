//
// Copyright 2026 DXOS.org
//

/**
 * A cell's place on the list's column template, by track name, on the title line. Shared by the tree's rows and the
 * edit pane, which lay out on the same template, so a field sits exactly where the value it edits is read; a cell
 * that is absent leaves its track empty. Literal so Tailwind finds the classes.
 */
export const TRACK = {
  gutter: 'row-start-1 col-[gutter]',
  status: 'row-start-1 col-[status]',
  title: 'row-start-1 col-[title]',
  artifacts: 'row-start-1 col-[artifacts]',
  assignee: 'row-start-1 col-[assignee]',
  estimate: 'row-start-1 col-[estimate]',
  priority: 'row-start-1 col-[priority]',
  actions: 'row-start-1 col-[actions]',
} as const;
