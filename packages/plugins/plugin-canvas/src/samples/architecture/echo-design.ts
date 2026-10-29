//
// Copyright 2026 DXOS.org
//

import { EID, Obj } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetRange from '@dxos/plugin-sheet/SheetRange';

import design from './echo-design.md?raw';

const HEADER = ['Operation', 'p50 (ms)', 'p95 (ms)', 'Target (ms)'] as const;

/** Illustrative figures, not measurements: each benchmark's median and 95th percentile against its target. */
export const ECHO_BENCHMARKS: ReadonlyArray<readonly [operation: string, p50: number, p95: number, target: number]> = [
  ['Open space (10k objects)', 180, 420, 500],
  ['First view render', 45, 90, 100],
  ['Local edit persisted', 3, 8, 10],
  ['Edit reaches peer (LAN)', 35, 80, 100],
  ['Edit reaches peer (EDGE)', 120, 260, 300],
  ['Query by type', 6, 14, 20],
  ['Full-text query (warm)', 12, 30, 40],
  ['Full-text query (cold)', 310, 780, 500],
  ['Vector search', 28, 60, 80],
  ['Rejoin after a week offline', 900, 2_100, 2_500],
];

const COLUMNS = 'ABCD';

/** Column widths: the operation names take the room the longest needs; the timings need far less than the 180px default. */
const OPERATION_COLUMN_SIZE = 260;
const TIMING_COLUMN_SIZE = 110;

/** The ECHO benchmarks as a sheet, charted as horizontal bars of median and 95th percentile against each target. */
export const makeEchoBenchmarks = (): Sheet.Sheet => {
  const rows = [HEADER, ...ECHO_BENCHMARKS];
  const cells = Object.fromEntries(
    rows.flatMap((row, rowIndex) =>
      row.map((value, columnIndex) => [`${COLUMNS[columnIndex]}${rowIndex + 1}`, { value }]),
    ),
  );
  const sheet = Sheet.make({
    name: 'ECHO benchmarks',
    rows: rows.length,
    columns: HEADER.length,
    cells,
    ranges: SheetRange.headerRanges(cells, `A1:${COLUMNS[HEADER.length - 1]}1`),
    charts: [
      {
        name: 'ECHO benchmarks',
        range: `A1:${COLUMNS[HEADER.length - 1]}${rows.length}`,
        type: 'bar',
        header: true,
        grid: true,
        horizontal: true,
      },
    ],
  });
  Obj.update(sheet, (sheet) => {
    sheet.columns.forEach((column, index) => {
      sheet.columnMeta[column] = { size: index === 0 ? OPERATION_COLUMN_SIZE : TIMING_COLUMN_SIZE };
    });
  });
  return sheet;
};

/** The objects the design document embeds, by the name its `{{...}}` placeholders use. */
export type EchoDesignEmbeds = Readonly<Record<string, Drawing.Drawing | Sheet.Sheet>>;

const PLACEHOLDER = /\{\{([a-z-]+)\}\}/g;

/**
 * The ECHO design document: eight chapters, three embedding a canvas diagram and one embedding the benchmarks sheet,
 * each `{{name}}` replaced with a block embed of that object by its space-relative URI.
 */
export const makeEchoDesign = (embeds: EchoDesignEmbeds): Markdown.Document =>
  Markdown.make({
    name: 'ECHO design',
    content: design.replaceAll(PLACEHOLDER, (placeholder, name: string) => {
      const object = embeds[name];
      if (!object) {
        throw new Error(`The ECHO design document embeds an unknown object: ${placeholder}.`);
      }
      return `![${Obj.getLabel(object) ?? name}](${EID.make({ entityId: object.id })})`;
    }),
  });
