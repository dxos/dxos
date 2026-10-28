//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetRange from '@dxos/plugin-sheet/SheetRange';

const HEADER = ['Plugin', 'PRs', 'Tests', 'Closed issues', 'Open issues'] as const;

/** Illustrative figures, not measured from the repository: merged PRs, tests, and closed and open issues per plugin, most PRs first. */
export const PLUGIN_METRICS: ReadonlyArray<
  readonly [plugin: string, prs: number, tests: number, closed: number, open: number]
> = [
  ['plugin-assistant', 538, 312, 188, 35],
  ['plugin-markdown', 412, 236, 144, 28],
  ['plugin-space', 371, 142, 130, 25],
  ['plugin-inbox', 326, 187, 114, 23],
  ['plugin-deck', 298, 118, 104, 21],
  ['plugin-sheet', 287, 198, 100, 20],
  ['plugin-debug', 254, 67, 89, 18],
  ['plugin-canvas', 241, 154, 84, 17],
  ['plugin-table', 219, 131, 77, 16],
  ['plugin-client', 203, 96, 71, 15],
  ['plugin-illustrator', 189, 163, 66, 14],
  ['plugin-thread', 176, 84, 62, 14],
  ['plugin-script', 167, 103, 58, 13],
  ['plugin-kanban', 147, 72, 51, 12],
  ['plugin-explorer', 124, 58, 43, 10],
  ['plugin-meeting', 98, 41, 34, 9],
  ['plugin-map', 92, 38, 32, 9],
  ['plugin-search', 86, 47, 30, 8],
  ['plugin-chess', 64, 29, 22, 7],
  ['plugin-mermaid', 51, 22, 18, 6],
];

const COLUMNS = 'ABCDE';

/** The plugins the PR-share pie covers: the busiest, so a slice stays wide enough to read. */
const PIE_PLUGINS = 8;

/** Column widths: the plugin names take the room the longest one needs; the counts need far less than the grid's 180px default. */
const PLUGIN_COLUMN_SIZE = 270;
const COUNT_COLUMN_SIZE = 120;

/**
 * Plugin size and activity as a sheet, charted as horizontal bars (plugins down the y axis, one series per measure)
 * and as a pie of the busiest plugins' share of merged PRs.
 */
export const makePluginMetrics = (): Sheet.Sheet => {
  const rows = [HEADER, ...PLUGIN_METRICS];
  const range = `A1:${COLUMNS[HEADER.length - 1]}${rows.length}`;
  const cells = Object.fromEntries(
    rows.flatMap((row, rowIndex) =>
      row.map((value, columnIndex) => [`${COLUMNS[columnIndex]}${rowIndex + 1}`, { value }]),
    ),
  );
  const sheet = Sheet.make({
    name: 'Plugin metrics',
    rows: rows.length,
    columns: HEADER.length,
    cells,
    ranges: SheetRange.headerRanges(cells, `A1:${COLUMNS[HEADER.length - 1]}1`),
    charts: [
      {
        name: 'Plugin metrics',
        range,
        type: 'bar',
        header: true,
        grid: true,
        horizontal: true,
        stacked: true,
      },
      {
        name: `PR share, top ${PIE_PLUGINS} plugins`,
        // A pie draws its range's first series, so the range is the plugin names and their PRs alone.
        range: `A1:B${PIE_PLUGINS + 1}`,
        type: 'pie',
        header: true,
      },
    ],
  });
  Obj.update(sheet, (sheet) => {
    sheet.columns.forEach((column, index) => {
      sheet.columnMeta[column] = { size: index === 0 ? PLUGIN_COLUMN_SIZE : COUNT_COLUMN_SIZE };
    });
  });
  return sheet;
};
