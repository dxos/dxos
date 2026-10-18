//
// Copyright 2026 DXOS.org
//

import * as Sheet from '@dxos/plugin-sheet/Sheet';

const HEADER = ['Plugin', 'PRs', 'Tests', 'Open issues', 'Closed issues'] as const;

/** Illustrative figures, not measured from the repository: merged PRs, tests, and open and closed issues per plugin. */
export const PLUGIN_METRICS: ReadonlyArray<
  readonly [plugin: string, prs: number, tests: number, open: number, closed: number]
> = [
  ['plugin-markdown', 412, 236, 28, 144],
  ['plugin-assistant', 538, 312, 35, 188],
  ['plugin-sheet', 287, 198, 20, 100],
  ['plugin-canvas', 241, 154, 17, 84],
  ['plugin-inbox', 326, 187, 23, 114],
  ['plugin-space', 371, 142, 25, 130],
  ['plugin-client', 203, 96, 15, 71],
  ['plugin-deck', 298, 118, 21, 104],
  ['plugin-table', 219, 131, 16, 77],
  ['plugin-kanban', 147, 72, 12, 51],
  ['plugin-illustrator', 189, 163, 14, 66],
  ['plugin-explorer', 124, 58, 10, 43],
  ['plugin-thread', 176, 84, 14, 62],
  ['plugin-meeting', 98, 41, 9, 34],
  ['plugin-script', 167, 103, 13, 58],
  ['plugin-search', 86, 47, 8, 30],
  ['plugin-map', 92, 38, 9, 32],
  ['plugin-chess', 64, 29, 7, 22],
  ['plugin-mermaid', 51, 22, 6, 18],
  ['plugin-debug', 254, 67, 18, 89],
];

const COLUMNS = 'ABCDE';

/** Plugin size and activity as a sheet, charted as horizontal bars: plugins down the y axis, one series per measure. */
export const makePluginMetrics = (): Sheet.Sheet => {
  const rows = [HEADER, ...PLUGIN_METRICS];
  const range = `A1:${COLUMNS[HEADER.length - 1]}${rows.length}`;
  return Sheet.make({
    name: 'Plugin metrics',
    rows: rows.length,
    columns: HEADER.length,
    cells: Object.fromEntries(
      rows.flatMap((row, rowIndex) =>
        row.map((value, columnIndex) => [`${COLUMNS[columnIndex]}${rowIndex + 1}`, { value }]),
      ),
    ),
    ranges: [
      // The header row takes the sheet's heading style; the numeric columns' headers sit over their right-aligned figures.
      { range: `A1:${COLUMNS[HEADER.length - 1]}1`, key: 'style', value: 'header' },
      { range: `B1:${COLUMNS[HEADER.length - 1]}1`, key: 'alignment', value: 'end' },
    ],
    charts: [
      {
        id: 'plugin-metrics',
        name: 'Plugin metrics',
        range,
        type: 'bar',
        header: true,
        grid: true,
        horizontal: true,
        stacked: true,
      },
    ],
  });
};
