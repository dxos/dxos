#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Lays out a run's light clips as the Grid grid in `temp/grid-zoom`: `tour-<n>.mp4` for the tour cells and
 * `clip-NN.mp4` (row-major) for every other cell. There are fewer clips than cells, so some repeat; each cell takes
 * the clip whose nearest copy is farthest away, so a repeat never sits beside or near itself. A tour clip counts as
 * placed on its tour cell, so it does not reappear next to the tour either.
 *
 *   node tools/autocue/showcase/layout.mjs --run temp/showcase/<run> [--tour markdown,canvas,projects,composer] [--min 3]
 *     [--tours 3] [--reuse-tours] [--once map,spacetime]
 *     [--pin explorer@3,2]
 *
 * The `--tours` tour cells take the first of `--tour` that recorded, so one failed tour flow does not block the
 * composite. `--reuse-tours` lets the tour clips fill grid cells too, for a run with few other clips, and `--once`
 * names clips placed at most once. Each `--pin <clip>@<col>,<row>` puts a clip on that cell before the rest are laid out.
 *
 * Writes `layout.json` beside the clips, naming the recording each file copies.
 *
 * Exits non-zero when two copies of a clip end up closer than `--min` cells (Chebyshev distance: a diagonal
 * neighbour is 1), so a run with too few clips is caught before the composite is rendered.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execFileSync('git', ['-C', HERE, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

const { values: options } = parseArgs({
  options: {
    'run': { type: 'string' },
    'tour': { type: 'string', default: 'markdown,canvas,projects,composer' },
    'min': { type: 'string', default: '3' },
    'cols': { type: 'string', default: '6' },
    'rows': { type: 'string', default: '6' },
    'tours': { type: 'string', default: '3' },
    'reuse-tours': { type: 'boolean', default: false },
    'once': { type: 'string', default: '' },
    'pin': { type: 'string', multiple: true, default: [] },
    'variant': { type: 'string', default: 'light' },
  },
});

if (!options.run) {
  console.error('usage: layout.mjs --run temp/showcase/<run> [--tour a,b,c] [--min 3]');
  process.exit(2);
}

const CLIPS = path.resolve(ROOT, options.run, 'clips', options.variant);
const GRID = path.join(ROOT, 'temp', 'grid-zoom');
const COLS = Number(options.cols);
const ROWS = Number(options.rows);

/** Grid's default tour: one cell of row 3 per tour from the left; three end in the bottom-left quadrant. */
const TOUR_CELLS = Array.from({ length: Number(options.tours) }, (_, col) => [col, 3]);

const available = readdirSync(CLIPS)
  .filter((file) => file.endsWith('.mp4'))
  .map((file) => file.slice(0, -'.mp4'.length))
  .sort();
const tour = options.tour
  .split(',')
  .map((name) => name.trim())
  .filter((name) => available.includes(name))
  .slice(0, TOUR_CELLS.length);
if (tour.length < TOUR_CELLS.length) {
  console.error(`only ${tour.length} of the tour clips (${options.tour}) recorded; ${TOUR_CELLS.length} are needed`);
  process.exit(1);
}
const pool = options['reuse-tours'] ? available : available.filter((name) => !tour.includes(name));
const once = new Set(options.once.split(',').map((name) => name.trim()));
if (pool.length === 0) {
  console.error('no grid clips besides the tour clips');
  process.exit(1);
}

const distance = ([ac, ar], [bc, br]) => Math.max(Math.abs(ac - bc), Math.abs(ar - br));

/** Where each clip already sits; a tour clip sits on its tour cell. */
const placed = new Map(tour.map((name, step) => [name, [TOUR_CELLS[step]]]));
const pins = options.pin.map((pin) => {
  const [name, at = ''] = pin.split('@');
  const [col, row] = at.split(',').map(Number);
  if (!available.includes(name) || !Number.isInteger(col) || !Number.isInteger(row)) {
    console.error(`bad --pin ${pin}: expected <clip>@<col>,<row> with a recorded clip`);
    process.exit(2);
  }
  placed.set(name, [...(placed.get(name) ?? []), [col, row]]);
  return { index: row * COLS + col, cell: [col, row], name, pinned: true };
});
const uses = (name) => placed.get(name)?.length ?? 0;
const nearest = (name, cell) => Math.min(Infinity, ...(placed.get(name) ?? []).map((other) => distance(cell, other)));

const isTour = (cell) => TOUR_CELLS.slice(0, tour.length).some((other) => distance(cell, other) === 0);
const grid = [...pins];
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const cell = [col, row];
    if (isTour(cell) || pins.some((pin) => distance(pin.cell, cell) === 0)) {
      continue;
    }
    // Farthest from its own nearest copy first, then the least used, then by name so a layout is repeatable.
    const [name] = pool
      .filter((name) => !once.has(name) || uses(name) === 0)
      .sort((a, b) => nearest(b, cell) - nearest(a, cell) || uses(a) - uses(b) || a.localeCompare(b));
    placed.set(name, [...(placed.get(name) ?? []), cell]);
    grid.push({ index: row * COLS + col, cell, name });
  }
}

/** How close copies sit: the smallest distance between two copies, and how many pairs sit at it. */
const score = () => {
  const gaps = [...placed.values()].flatMap((cells) =>
    cells.flatMap((cell, index) => cells.slice(index + 1).map((other) => distance(cell, other))),
  );
  const min = Math.min(Infinity, ...gaps);
  return { min, at: gaps.filter((gap) => gap === min).length };
};
const better = (a, b) => a.min > b.min || (a.min === b.min && a.at < b.at);

// The greedy fill is row by row, so later cells get what is left; swapping pairs of cells spreads repeats further.
const move = (entry, name) => {
  const cells = placed.get(entry.name);
  cells.splice(
    cells.findIndex((cell) => distance(cell, entry.cell) === 0),
    1,
  );
  placed.set(name, [...(placed.get(name) ?? []), entry.cell]);
  entry.name = name;
};
for (let improved = true; improved;) {
  improved = false;
  for (const a of grid) {
    for (const b of grid) {
      if (a.name === b.name || a.pinned || b.pinned) {
        continue;
      }
      const before = score();
      const [nameA, nameB] = [a.name, b.name];
      move(a, nameB);
      move(b, nameA);
      if (better(score(), before)) {
        improved = true;
      } else {
        move(b, nameB);
        move(a, nameA);
      }
    }
  }
}

const closest = Math.min(
  ...[...placed.entries()].flatMap(([, cells]) =>
    cells.flatMap((cell, index) => cells.slice(index + 1).map((other) => distance(cell, other))),
  ),
);

rmSync(GRID, { recursive: true, force: true });
mkdirSync(GRID, { recursive: true });
for (const [step, name] of tour.entries()) {
  copyFileSync(path.join(CLIPS, `${name}.mp4`), path.join(GRID, `tour-${step + 1}.mp4`));
}
for (const { index, name } of grid) {
  copyFileSync(path.join(CLIPS, `${name}.mp4`), path.join(GRID, `clip-${String(index).padStart(2, '0')}.mp4`));
}
// Which recording each file copies, so the Grid can tell repeats apart (a drift keeps them out of one column).
writeFileSync(
  path.join(GRID, 'layout.json'),
  JSON.stringify(
    Object.fromEntries([
      ...tour.map((name, step) => [`tour-${step + 1}`, name]),
      ...grid.map(({ index, name }) => [`clip-${String(index).padStart(2, '0')}`, name]),
    ]),
    null,
    2,
  ) + '\n',
);

for (let row = 0; row < ROWS; row++) {
  const line = [];
  for (let col = 0; col < COLS; col++) {
    const step = TOUR_CELLS.slice(0, tour.length).findIndex((other) => distance([col, row], other) === 0);
    line.push((step >= 0 ? `*${tour[step]}` : grid.find((entry) => entry.index === row * COLS + col).name).padEnd(12));
  }
  console.log(line.join(' '));
}
const repeated = Number.isFinite(closest);
console.log(
  `${tour.length} tour + ${grid.length} grid cells from ${available.length} clips -> ${path.relative(ROOT, GRID)}; ` +
    (repeated ? `closest repeat is ${closest} cells apart` : 'no clip repeats'),
);
if (repeated && closest < Number(options.min)) {
  console.error(`a clip repeats ${closest} cells from itself (under --min ${options.min}); record more clips`);
  process.exit(1);
}
