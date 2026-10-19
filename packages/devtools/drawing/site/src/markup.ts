//
// Copyright 2026 DXOS.org
//

import { type Report } from '@dxos/drawing';

/** The drawing the hero shows, by its file name in `diagrams/`. */
export const HERO = 'arch';

/**
 * The engine's layout unit (`UmlGrid.GRID`): every box edge it places falls on a multiple of it, in scene units.
 * Restated rather than imported, because importing `@dxos/diagram` would pull the layout engine into the editor's
 * chunk; `drawing.test.ts` holds the two equal.
 */
export const GRID = 32;

/** A rendered diagram ready to put on the page, with its size in grid cells. */
export type Inline = { readonly markup: string; readonly cols: number; readonly rows: number };

export type InlineOptions = {
  /** Prefixes the SVG's marker ids, so several diagrams can share one page. */
  readonly prefix: string;
  readonly label: string;
  readonly className?: string;
  /** Pads the viewBox to at least this many cells (odd), so drawings that share a row also share a scale. */
  readonly minCols?: number;
  readonly minRows?: number;
};

/**
 * Grows a viewBox span outwards to whole grid cells, to an odd count: the page centres the drawing on a grid
 * whose lines it also centres, and only an odd count puts the scene's cell lines on the page's.
 */
const snap = (start: number, size: number, min = 0): { start: number; size: number; cells: number } => {
  const first = Math.floor(start / GRID);
  const last = Math.ceil((start + size) / GRID);
  const odd = (last - first) % 2 === 0 ? last - first + 1 : last - first;
  const cells = Math.max(odd, min % 2 === 0 ? min + 1 : min);
  // Odd minus odd is even, so the padding splits evenly and the drawing stays centred.
  const pad = (cells - odd) / 2;
  return { start: (first - pad) * GRID, size: cells * GRID, cells };
};

/**
 * The renderer's SVG made inline-ready: its stylesheet and payload dropped (the page themes the renderer's
 * classes), its fixed size dropped so CSS sizes it per grid cell, its viewBox snapped to whole cells, and its
 * marker ids prefixed.
 */
export const inline = (svg: string, { prefix, label, className = '', minCols, minRows }: InlineOptions): Inline => {
  const viewBox = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(svg);
  if (!viewBox) {
    throw new Error('Not a rendered diagram: the SVG has no viewBox.');
  }
  const [x, y, width, height] = viewBox.slice(1).map(Number);
  const horizontal = snap(x, width, minCols);
  const vertical = snap(y, height, minRows);
  const markup = svg
    .replace(/<!--[\s\S]*?-->\n?/g, '')
    .replace(/<metadata\b[\s\S]*?<\/metadata>/, '')
    .replace(/<style>[\s\S]*?<\/style>/, '')
    .replace(/ width="[^"]*" height="[^"]*"/, '')
    .replace(viewBox[0], `viewBox="${horizontal.start} ${vertical.start} ${horizontal.size} ${vertical.size}"`)
    .replaceAll('id="dx-', `id="${prefix}-`)
    .replaceAll('url(#dx-', `url(#${prefix}-`)
    .replace('class="dx-fill', `role="img" aria-label="${escapeHtml(label)}" class="diagram ${className} dx-fill`);
  return { markup, cols: horizontal.cells, rows: vertical.cells };
};

/** Text safe to put in HTML content or a double-quoted attribute. */
export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** The CLI's summary of a render, line by line, as `drawing render` prints it. */
export const summary = (name: string, report: Report): string[] =>
  report.failed && report.nodes === 0
    ? [`$ drawing render ${name}.dx`, 'did not compile']
    : [
        `$ drawing render ${name}.dx`,
        `${plural(report.nodes, 'node')}, ${plural(report.connectors, 'connector')}`,
        `${plural(report.crossings, 'crossing')}, ${plural(report.bends, 'bend')}`,
        report.failed ? 'layout has errors' : `wrote ${name}.dx.svg`,
      ];

/** The name a drawing downloads as, carrying its source. */
export const fileName = (name: string): string => `${name}.dx.svg`;

/** The report as the page shows it: the CLI's summary, then every note. */
export const reportHtml = (name: string, report: Report): string =>
  [
    ...summary(name, report).map((line, index) => (index === 0 ? `<b>${escapeHtml(line)}</b>` : escapeHtml(line))),
    ...report.notes.map(
      ({ severity, message }) => `<span class="note ${severity}">${escapeHtml(`${severity}: ${message}`)}</span>`,
    ),
  ].join('<br />\n');

/** A stage: the drawing on the page grid, sized in the engine's layout cells. */
export const stageHtml = (markup: string, cols: number, rows: number): string =>
  `<div class="stage" id="stage" style="--cols: ${cols}; --rows: ${rows}">${markup}</div>`;
