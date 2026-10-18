//
// Copyright 2026 DXOS.org
//

import * as Sheet from '@dxos/plugin-sheet/Sheet';

const HEADER = ['Plugin', 'KLOC', 'PRs', 'Tests'] as const;

/**
 * Illustrative figures, not measured from the repository. Lines of code are in thousands, so the three measures share
 * one axis without the line counts dwarfing the rest.
 */
export const PLUGIN_METRICS: ReadonlyArray<readonly [plugin: string, kloc: number, prs: number, tests: number]> = [
  ['plugin-markdown', 18.4, 412, 236],
  ['plugin-assistant', 24.9, 538, 312],
  ['plugin-sheet', 15.7, 287, 198],
  ['plugin-canvas', 12.9, 241, 154],
  ['plugin-inbox', 14.2, 326, 187],
  ['plugin-space', 16.6, 371, 142],
  ['plugin-client', 9.9, 203, 96],
  ['plugin-deck', 11.3, 298, 118],
  ['plugin-table', 10.1, 219, 131],
  ['plugin-kanban', 6.5, 147, 72],
  ['plugin-illustrator', 13.7, 189, 163],
  ['plugin-explorer', 7.9, 124, 58],
  ['plugin-thread', 8.3, 176, 84],
  ['plugin-meeting', 5.8, 98, 41],
  ['plugin-script', 9.1, 167, 103],
  ['plugin-search', 4.4, 86, 47],
  ['plugin-map', 5.2, 92, 38],
  ['plugin-chess', 3.1, 64, 29],
  ['plugin-mermaid', 2.5, 51, 22],
  ['plugin-debug', 11.9, 254, 67],
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
