//
// Copyright 2026 DXOS.org
//

import * as Sheet from '@dxos/plugin-sheet/Sheet';

const HEADER = ['Plugin', 'Files', 'PRs', 'Tests'] as const;

/** Illustrative figures, not measured from the repository: source files, merged PRs and tests per plugin. */
export const PLUGIN_METRICS: ReadonlyArray<readonly [plugin: string, files: number, prs: number, tests: number]> = [
  ['plugin-markdown', 230, 412, 236],
  ['plugin-assistant', 311, 538, 312],
  ['plugin-sheet', 196, 287, 198],
  ['plugin-canvas', 161, 241, 154],
  ['plugin-inbox', 178, 326, 187],
  ['plugin-space', 208, 371, 142],
  ['plugin-client', 124, 203, 96],
  ['plugin-deck', 141, 298, 118],
  ['plugin-table', 126, 219, 131],
  ['plugin-kanban', 81, 147, 72],
  ['plugin-illustrator', 171, 189, 163],
  ['plugin-explorer', 99, 124, 58],
  ['plugin-thread', 104, 176, 84],
  ['plugin-meeting', 72, 98, 41],
  ['plugin-script', 114, 167, 103],
  ['plugin-search', 55, 86, 47],
  ['plugin-map', 65, 92, 38],
  ['plugin-chess', 39, 64, 29],
  ['plugin-mermaid', 31, 51, 22],
  ['plugin-debug', 149, 254, 67],
];

const COLUMNS = 'ABCD';

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
