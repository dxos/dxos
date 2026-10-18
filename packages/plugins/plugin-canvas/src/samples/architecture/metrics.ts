//
// Copyright 2026 DXOS.org
//

import * as Sheet from '@dxos/plugin-sheet/Sheet';

const HEADER = ['Plugin', 'LOC', 'PRs', 'Tests'] as const;

/** Illustrative figures, not measured from the repository. */
export const PLUGIN_METRICS: ReadonlyArray<readonly [plugin: string, loc: number, prs: number, tests: number]> = [
  ['plugin-markdown', 18_420, 412, 236],
  ['plugin-assistant', 24_860, 538, 312],
  ['plugin-sheet', 15_730, 287, 198],
  ['plugin-canvas', 12_940, 241, 154],
  ['plugin-inbox', 14_210, 326, 187],
  ['plugin-space', 16_580, 371, 142],
  ['plugin-client', 9_870, 203, 96],
  ['plugin-deck', 11_340, 298, 118],
  ['plugin-table', 10_120, 219, 131],
  ['plugin-kanban', 6_480, 147, 72],
  ['plugin-illustrator', 13_650, 189, 163],
  ['plugin-explorer', 7_920, 124, 58],
  ['plugin-thread', 8_310, 176, 84],
  ['plugin-meeting', 5_760, 98, 41],
  ['plugin-script', 9_140, 167, 103],
  ['plugin-search', 4_380, 86, 47],
  ['plugin-map', 5_210, 92, 38],
  ['plugin-chess', 3_150, 64, 29],
  ['plugin-mermaid', 2_470, 51, 22],
  ['plugin-debug', 11_890, 254, 67],
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
    charts: [
      { id: 'plugin-metrics', name: 'Plugin metrics', range, type: 'bar', header: true, grid: true, horizontal: true },
    ],
  });
};
