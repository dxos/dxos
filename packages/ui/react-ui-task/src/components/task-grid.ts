//
// Copyright 2026 DXOS.org
//

/**
 * The geometry a task's sections share: a fixed glyph column, then the content.
 *
 * Shared as a class list rather than as one grid, because the sections do not nest — properties,
 * questions and history each own their own element and could not subgrid onto a common parent
 * without becoming one component. A fixed first column is what makes them line up anyway: 24px is
 * 24px in every section, where an `auto` or `min-content` column would size to each section's own
 * widest glyph and land them a pixel or two apart.
 */
export const TASK_GRID = 'grid grid-cols-[1.5rem_1fr] gap-x-1 items-start';

/** Content in the second column: a row with no glyph of its own (a question's options, its context). */
export const TASK_GRID_CONTENT = 'col-start-2';

/**
 * The glyph cell: one line box tall, so what it centres is the centre of its row's FIRST line — a
 * cell as tall as the row would float the glyph down a wrapped paragraph.
 */
export const TASK_GRID_ICON = 'col-start-1 grid place-items-center h-[1lh]';
