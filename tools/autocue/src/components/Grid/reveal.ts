//
// Copyright 2026 DXOS.org
//

import { type Camera, easeInOut, fitBounds, interpolateCamera } from '@dxos/react-ui-canvas';
import { type Bounds, type Size } from '@dxos/scene';

export const TILE = { width: 960, height: 540 };

/**
 * How the grid is shown: `shift` and `console` replace the tour with the shift loop (see `shiftShots`, `deckShots`);
 * the others follow the tour
 * with a reveal, `zoom` being the original straight pull-back.
 */
export const VARIANTS = ['shift', 'console', 'zoom', 'columns', 'steps', 'mosaic'] as const;

export type Variant = (typeof VARIANTS)[number];

export type Cell = {
  id: string;
  col: number;
  row: number;
  /** The clip's file name without extension; unset draws the cell's number instead. */
  clip?: string;
  label: string;
  /** Scene bounds in the grid. */
  bounds: Bounds;
};

/** What a frame of the reveal draws: the camera, and optionally where each cell has moved to. */
export type Frame = {
  camera: Camera;
  /** Scene bounds of a cell at this frame; unset keeps the grid's. */
  place?: (cell: Cell) => Bounds;
  /** Scene bounds a cell is clipped to (the region it slides within). */
  clip?: (cell: Cell) => Bounds | undefined;
  /** How a cell is drawn beyond its clip: a header strip, and which edge of the clip stays in view when cropped. */
  meta?: (cell: Cell) => CellMeta | undefined;
  /** Static shapes drawn under the cells, in scene units. */
  decor?: Decor[];
};

export type CellMeta = {
  /** A plank header strip above the clip, with this title; `ratio` is its share of the cell's height. */
  header?: { title: string; icon: string; ratio: number };
  /** Which side of a cropped clip stays in view. */
  align?: 'left' | 'right';
};

/** A panel, swatch or icon drawn in scene units. */
export type Decor = { bounds: Bounds; className: string; icon?: string; radius?: number };

export type RevealContext = {
  /** The camera on the last tour cell when the reveal starts. */
  from: Camera;
  cells: Cell[];
  /** The last tour cell. */
  focus: Cell;
  /** Ids of every tour cell. */
  tour: string[];
  /** Bounds of every cell. */
  extent: Bounds;
  viewport: Size;
  gap: number;
  cols: number;
  rows: number;
  /** The reveal's length, in ms. */
  duration: number;
};

/** A frame for each ms into the reveal; pure, so a stepped render gets the same frame for the same time. */
export type Reveal = (ms: number) => Frame;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** `value` moved by whole `length`s into `[start, start + length)`, so a scrolling cell re-enters on the far side. */
export const wrap = (value: number, start: number, length: number) =>
  start + ((((value - start) % length) + length) % length);

/** Distance travelled by `ms` at unit speed when the speed ramps up linearly over `ramp` ms, so motion starts gently. */
const rampTravel = (ms: number, ramp: number) => (ms < ramp ? (ms * ms) / (2 * ramp) : ms - ramp / 2);

/** A deterministic 0–1 value per cell, so a layout is the same on every render. */
export const hash = (col: number, row: number) =>
  ((((col + 7) * 73_856_093) ^ ((row + 3) * 19_349_663)) % 1_000) / 1_000;

/** The original: one smooth zoom-and-pan until the whole grid fits. */
const zoom = ({ from, extent, viewport, gap, duration }: RevealContext): Reveal => {
  const path = interpolateCamera(from, fitBounds(extent, viewport, gap), viewport);
  return (ms) => ({ camera: path(easeInOut(clamp(ms / duration))) });
};

/** Pulls back to three columns around the last tour cell, then each column scrolls endlessly, alternating up and down. */
const columns = ({ from, focus, viewport, gap, rows, duration }: RevealContext): Reveal => {
  const pitch = { x: TILE.width + gap, y: TILE.height + gap };
  const settle = Math.min(duration * 0.35, 4_000);
  const path = interpolateCamera(
    from,
    fitBounds(
      { x: focus.bounds.x - pitch.x, y: focus.bounds.y, width: 3 * pitch.x - gap, height: TILE.height },
      viewport,
      gap,
    ),
    viewport,
  );
  const height = rows * pitch.y;
  const centre = focus.bounds.y + TILE.height / 2;
  // One row every three seconds: slow enough for each tile to read as it passes.
  const speed = pitch.y / 3_000;
  return (ms) => {
    const travel = speed * rampTravel(ms, settle);
    return {
      camera: path(easeInOut(clamp(ms / settle))),
      place: (cell) => {
        const direction = cell.col % 2 === 0 ? -1 : 1;
        const middle = wrap(cell.bounds.y + TILE.height / 2 + direction * travel, centre - height / 2, height);
        return { ...cell.bounds, y: middle - TILE.height / 2 };
      },
    };
  };
};

/**
 * Splits `duration` into a fast move and a hold per leg, the holds shrinking from 1.5x to 0.5x the mean so the
 * montage speeds up; returns each leg's start, in ms.
 */
const schedule = (legs: number, duration: number, move: number) => {
  const weights = Array.from({ length: legs }, (_, index) => 1.5 - (legs > 1 ? index / (legs - 1) : 0));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const hold = Math.max(0, duration - legs * move);
  const starts: number[] = [];
  let start = 0;
  for (const weight of weights) {
    starts.push(start);
    start += move + (hold * weight) / total;
  }
  return starts;
};

/** The leg playing at `ms` and how far through its move (0–1), from the legs' start times. */
const legAt = (starts: number[], ms: number, move: number) => {
  let index = 0;
  while (index < starts.length - 1 && ms >= starts[index + 1]) {
    index++;
  }
  return { index, t: clamp((ms - starts[index]) / move) };
};

/** The length of every cut, as in the After Effects reference: about half a second with a hard ease. */
const CUT = 500;

/** Ease with a hard middle, as a whip-pan: most of the travel happens in a few frames. */
export const whip = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

const lerpCamera = (from: Camera, to: Camera, t: number): Camera => ({
  zoom: from.zoom + (to.zoom - from.zoom) * t,
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
});

/**
 * A camera montage over the wall that never frames more than 2x2: it pulls back from the last tour cell to the 2x2
 * around it, pushes in on another cell, whip-pans full frame across the wall, pulls back to a new 2x2, and so on, each
 * cut half a second and the holds getting shorter.
 */
const steps = ({ from, focus, viewport, gap, cols, rows, duration }: RevealContext): Reveal => {
  const pitch = { x: TILE.width + gap, y: TILE.height + gap };
  const col = (value: number, span: number) => Math.min(cols - span, Math.max(0, value));
  const row = (value: number, span: number) => Math.min(rows - span, Math.max(0, value));
  const quad = (c: number, r: number) =>
    fitBounds(
      { x: col(c, 2) * pitch.x, y: row(r, 2) * pitch.y, width: 2 * pitch.x - gap, height: 2 * pitch.y - gap },
      viewport,
    );
  const cell = (c: number, r: number) =>
    fitBounds({ x: col(c, 1) * pitch.x, y: row(r, 1) * pitch.y, ...TILE }, viewport);
  const { col: fc, row: fr } = focus;
  // Out, in, across, out, in, up, in, back across, out: alternating pulls, pushes and whips over new cells.
  const cameras = [
    from,
    quad(fc - 1, fr),
    cell(fc - 1, fr + 1),
    cell(fc + 2, fr + 1),
    quad(fc + 2, fr),
    cell(fc + 3, fr),
    quad(fc + 2, fr - 2),
    cell(fc + 2, fr - 2),
    cell(fc - 1, fr - 2),
    quad(fc - 2, fr - 3),
  ];
  const legs = cameras.length - 1;
  const starts = schedule(legs, duration, CUT);
  const paths = cameras.slice(1).map((to, index) => {
    const start = cameras[index];
    // A pan at one zoom is a straight whip; a change of zoom follows the smooth zoom-and-pan path.
    return Math.abs(start.zoom - to.zoom) < 1e-6
      ? (t: number) => lerpCamera(start, to, whip(t))
      : (
          (path) => (t: number) =>
            path(easeInOut(t))
        )(interpolateCamera(start, to, viewport));
  });
  return (ms) => {
    const { index, t } = legAt(starts, ms, CUT);
    return { camera: paths[index](t) };
  };
};

/** A cell of a mosaic layout as fractions of the frame: `[x, y, width, height]`. */
type Slot = [number, number, number, number];

const grid = (across: number, down: number): Slot[] =>
  Array.from({ length: across * down }, (_, index) => [
    (index % across) / across,
    Math.floor(index / across) / down,
    1 / across,
    1 / down,
  ]);

/**
 * The montage's layouts in turn, after the last tour cell's full frame: `from` is the slot the previous full-frame
 * cell lands in, `grow` the slot that grows to full frame next (the last layout holds to the end).
 */
const LAYOUTS: { slots: Slot[]; from: number; grow?: number }[] = [
  { slots: grid(2, 2), from: 0, grow: 3 },
  { slots: grid(3, 2), from: 4, grow: 2 },
  { slots: grid(2, 1), from: 1, grow: 0 },
  {
    slots: [
      [0, 0, 2 / 3, 1],
      [2 / 3, 0, 1 / 3, 1 / 2],
      [2 / 3, 1 / 2, 1 / 3, 1 / 2],
    ],
    from: 0,
    grow: 2,
  },
  { slots: grid(3, 2), from: 0 },
];

/**
 * The After Effects grid cycle with a fixed camera: full frame, split into a grid as new clips push in from the
 * frame's edges, one cell grows back to full frame as the rest are pushed out, then a new grid shape, each cut half
 * a second and the holds getting shorter; never more than 3x2, cells edge to edge with a thin gap and cropped to fill.
 */
const mosaic = ({ from, cells, focus, tour, viewport, duration }: RevealContext): Reveal => {
  // The cell after the last tour cell leads (it holds the fourth tour clip), then the rest in a fixed shuffle.
  const next = cells.find((cell) => cell.row === focus.row && cell.col === focus.col + 1);
  const queue = [
    ...(next ? [next] : []),
    ...cells
      .filter((cell) => !tour.includes(cell.id) && cell.id !== next?.id)
      .sort((a, b) => hash(a.col, a.row) - hash(b.col, b.row)),
  ];
  const gutter = 6;
  const full: Slot = [0, 0, 1, 1];
  /** Each stage's slots and the cell in each: full frames alternate with layouts. */
  const stages: { slots: Slot[]; cells: Cell[] }[] = [{ slots: [full], cells: [focus] }];
  let taken = 0;
  for (const layout of LAYOUTS) {
    const kept = stages[stages.length - 1].cells[0];
    const order = layout.slots.map((_, index) => index).filter((index) => index !== layout.from);
    // The slot that grows next takes the first new cell, so the fourth tour clip is the first to fill the frame.
    if (layout.grow !== undefined) {
      order.sort((a, b) => (a === layout.grow ? -1 : b === layout.grow ? 1 : a - b));
    }
    const placed: Cell[] = [];
    placed[layout.from] = kept;
    for (const index of order) {
      placed[index] = queue[taken++ % queue.length];
    }
    stages.push({ slots: layout.slots, cells: placed });
    if (layout.grow !== undefined) {
      stages.push({ slots: [full], cells: [placed[layout.grow]] });
    }
  }
  /** Screen bounds of a slot: inner edges inset by half the gutter, frame edges flush. */
  const screen = ([x, y, width, height]: Slot): Bounds => {
    const left = x * viewport.width + (x > 0 ? gutter / 2 : 0);
    const top = y * viewport.height + (y > 0 ? gutter / 2 : 0);
    const right = (x + width) * viewport.width - (x + width < 1 ? gutter / 2 : 0);
    const bottom = (y + height) * viewport.height - (y + height < 1 ? gutter / 2 : 0);
    return { x: left, y: top, width: right - left, height: bottom - top };
  };
  /** The bounds pushed just past the nearest frame edge, so a cell enters or leaves by sliding, never by scaling. */
  const outside = (bounds: Bounds): Bounds => {
    const distances = [
      { x: -(bounds.x + bounds.width), y: 0 },
      { x: viewport.width - bounds.x, y: 0 },
      { x: 0, y: -(bounds.y + bounds.height) },
      { x: 0, y: viewport.height - bounds.y },
    ];
    const nearest = distances.reduce((best, push) =>
      Math.abs(push.x) + Math.abs(push.y) < Math.abs(best.x) + Math.abs(best.y) ? push : best,
    );
    return { ...bounds, x: bounds.x + nearest.x, y: bounds.y + nearest.y };
  };
  const toScene = (bounds: Bounds): Bounds => ({
    x: bounds.x / from.zoom - from.x,
    y: bounds.y / from.zoom - from.y,
    width: bounds.width / from.zoom,
    height: bounds.height / from.zoom,
  });
  const hidden = toScene({ x: 0, y: 2 * viewport.height, width: viewport.width, height: viewport.height });
  const starts = schedule(stages.length - 1, duration, CUT);
  return (ms) => {
    const { index, t } = legAt(starts, ms, CUT);
    const before = stages[index];
    const after = stages[index + 1];
    const eased = easeInOut(t);
    return {
      camera: from,
      place: (cell) => {
        const was = before.cells.indexOf(cell);
        const will = after.cells.indexOf(cell);
        if (was < 0 && will < 0) {
          return hidden;
        }
        const end = will >= 0 ? screen(after.slots[will]) : outside(screen(before.slots[was]));
        const start = was >= 0 ? screen(before.slots[was]) : outside(end);
        return toScene({
          x: start.x + (end.x - start.x) * eased,
          y: start.y + (end.y - start.y) * eased,
          width: start.width + (end.width - start.width) * eased,
          height: start.height + (end.height - start.height) * eased,
        });
      },
    };
  };
};

export const REVEALS: Record<Exclude<Variant, 'shift' | 'console'>, (context: RevealContext) => Reveal> = {
  zoom,
  columns,
  steps,
  mosaic,
};

/** A leg of the shift loop's timeline: `frame` takes the leg's raw progress (0–1); `focus` is the close-up cell. */
export type ShiftShot = {
  ms: number;
  focus?: string;
  frame: (t: number) => Frame;
  live?: boolean;
  /** A drift's columns, each its cells' ids top to bottom, so clips can be laid out without a repeat in one column. */
  columns?: string[][];
};

export type ShiftOptions = {
  cells: Cell[];
  /** The close-ups in order (the tour cells, then the montage's); each is seeded so it lands in the centre on its turn. */
  sequence: Cell[];
  /**
   * Each close-up's slot, in ms, from landing in the centre to the next close-up landing: its hold plus one
   * transition (zoom out, shift, zoom in); the last slot is all hold.
   */
  slots: number[];
  viewport: Size;
  gap: number;
  cols: number;
  rows: number;
  /** Zoom out to 3x3 (and back in), in ms. */
  zoom: number;
  /** The row or column slide, in ms. */
  shift: number;
  /** Cells each shift moves: 1 or 2, or 0 to vary it from cycle to cycle. */
  distance: number;
  /** Holds the camera on the zoomed-out 3x3 throughout, so only the shifts move. */
  overview?: boolean;
  /**
   * Cells per second: in place of the stepped loop, the zoomed-out 3x3's columns all drift down continuously, each at
   * its own multiple of this speed, for the whole timeline.
   */
  drift?: number;
  /** After the last close-up, zooms out and drifts (at `drift`, or 0.2 cells per second) for this many ms. */
  driftAfter?: number;
};

/** Strong ease-in-out for the zooms: quick to leave and quick to settle. */
export const snap = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

/** How much of the rows beyond the 3x3 the zoomed-out shift loop shows, as a fraction of a tile's height. */
export const PEEK = 0.15;

/** Each column's drift speed relative to `drift`, from the leftmost wall column; distinct so no two neighbours lock. */
export const DRIFT_SPEEDS = [1.2, 1.5, 0.7, 1, 1.3, 0.8];

/** The distances a varying shift takes in turn. */
export const DISTANCES = [1, 2, 1, 1, 2, 2, 1, 2];

/** The outer line (-1 first, 1 third) that moves at double speed on a shift, picked per step so a run is repeatable. */
export const fastLine = (step: number): -1 | 1 => (hash(step, 11) < 0.5 ? -1 : 1);

/** A line's speed on a shift: the fast line covers twice the distance in the same time. */
export const lineSpeed = (line: number, fast: number) => (Math.round(line) === fast ? 2 : 1);

/**
 * The shift loop: a close-up fills the frame and plays; the camera zooms out to the 3x3 around it; alternate rows
 * (then, next cycle, alternate columns) slide one or two cells in opposite directions; the camera zooms in on
 * whichever cell landed in the centre, which is the next close-up. The wall is a torus of every cell, so a row
 * or column that slides out on one side slides back in on the other, beyond the frame. Cells are seeded so the tour
 * cells land in the centre in turn, then the montage's, whose shorter slots speed the cycle up.
 */
export const shiftShots = ({
  cells,
  sequence,
  slots,
  viewport,
  gap,
  cols,
  rows,
  zoom,
  shift,
  distance,
  overview = false,
  drift = 0,
  driftAfter = 0,
}: ShiftOptions): ShiftShot[] => {
  const pitch = { x: TILE.width + gap, y: TILE.height + gap };
  const closeUps = Math.max(1, slots.length);
  const shifts = Array.from({ length: closeUps - 1 }, (_, step) => ({
    // Rows on even steps, columns on odd ones.
    axis: step % 2 === 0 ? ('row' as const) : ('col' as const),
    by: distance === 1 || distance === 2 ? distance : DISTANCES[step % DISTANCES.length],
    fast: fastLine(step),
  }));
  /** Direction a line moves: top row right, middle left, bottom right; left column down, middle up, right down. */
  const direction = (line: number) => (Math.abs(line) % 2 === 1 ? 1 : -1);
  const wrapCol = (x: number) => wrap(x, -Math.floor(cols / 2), cols);
  const wrapRow = (y: number) => wrap(y, -Math.floor(rows / 2), rows);
  type Point = { x: number; y: number };
  const apply = (point: Point, { axis, by, fast }: (typeof shifts)[number], t = 1): Point =>
    axis === 'row'
      ? { x: wrapCol(point.x + direction(point.y) * lineSpeed(point.y, fast) * by * t), y: point.y }
      : { x: point.x, y: wrapRow(point.y + direction(point.x) * lineSpeed(point.x, fast) * by * t) };
  const unapply = (point: Point, { axis, by, fast }: (typeof shifts)[number]): Point =>
    axis === 'row'
      ? { x: wrapCol(point.x - direction(point.y) * lineSpeed(point.y, fast) * by), y: point.y }
      : { x: point.x, y: wrapRow(point.y - direction(point.x) * lineSpeed(point.x, fast) * by) };

  // Seed: each close-up starts where the shifts before its turn carry it into the centre; a start another close-up
  // already claimed is left to whichever cell lands there.
  const key = ({ x, y }: Point) => `${x},${y}`;
  const seed = new Map<string, Cell>();
  sequence.slice(0, closeUps).forEach((cell, step) => {
    let point: Point = { x: 0, y: 0 };
    for (let index = step - 1; index >= 0; index--) {
      point = unapply(point, shifts[index]);
    }
    if (!seed.has(key(point)) && ![...seed.values()].includes(cell)) {
      seed.set(key(point), cell);
    }
  });
  const seeded = new Set(seed.values());
  const rest = cells.filter((cell) => !seeded.has(cell)).sort((a, b) => hash(a.col, a.row) - hash(b.col, b.row));
  const start = new Map<Cell, Point>();
  for (let y = -Math.floor(rows / 2); y < rows - Math.floor(rows / 2); y++) {
    for (let x = -Math.floor(cols / 2); x < cols - Math.floor(cols / 2); x++) {
      const cell = seed.get(key({ x, y })) ?? rest.shift();
      if (cell) {
        start.set(cell, { x, y });
      }
    }
  }
  /** Every cell's position after each number of completed shifts. */
  const positions: Map<Cell, Point>[] = [start];
  for (const step of shifts) {
    const previous = positions[positions.length - 1];
    positions.push(new Map([...previous].map(([cell, point]) => [cell, apply(point, step)])));
  }
  const centreOf = (placed: Map<Cell, Point>) => [...placed].find(([, point]) => point.x === 0 && point.y === 0)?.[0];

  const bounds = ({ x, y }: Point): Bounds => ({ x: x * pitch.x, y: y * pitch.y, ...TILE });
  const near = fitBounds(bounds({ x: 0, y: 0 }), viewport);
  // Zoomed out, a sliver of the rows beyond the 3x3 shows at the top and bottom, so the wall reads as continuing.
  const peek = PEEK * TILE.height;
  const far = fitBounds(
    { x: -pitch.x, y: -pitch.y - peek, width: 3 * pitch.x - gap, height: 3 * pitch.y - gap + 2 * peek },
    viewport,
    gap,
  );
  const close = overview ? far : near;
  const out = overview ? () => far : interpolateCamera(near, far, viewport);
  const into = overview ? () => far : interpolateCamera(far, near, viewport);
  const hidden: Bounds = { x: cols * pitch.x * 4, y: 0, ...TILE };
  const at = (placed: Map<Cell, Point>) => (cell: Cell) => {
    const point = placed.get(cell);
    return point ? bounds(point) : hidden;
  };

  const speed = (x: number) => DRIFT_SPEEDS[(x + Math.floor(cols / 2)) % DRIFT_SPEEDS.length];
  /** `ms` of the zoomed-out wall drifting down from `placed`; every clip plays, as there is no close-up. */
  const drifting = (placed: Map<Cell, Point>, ms: number, rate: number): ShiftShot => ({
    ms,
    live: true,
    columns: Object.values(
      Object.groupBy(
        [...placed].sort(([, a], [, b]) => a.y - b.y),
        ([, point]) => point.x,
      ),
    ).map((column) => (column ?? []).map(([cell]) => cell.id)),
    frame: (t) => ({
      camera: far,
      place: (cell) => {
        const point = placed.get(cell);
        return point
          ? bounds({ x: point.x, y: wrapRow(point.y + speed(point.x) * rate * ((t * ms) / 1_000)) })
          : hidden;
      },
    }),
  });

  if (drift > 0 && driftAfter === 0) {
    return [
      drifting(
        start,
        slots.reduce((sum, slot) => sum + slot, 0),
        drift,
      ),
    ];
  }

  const loop = Array.from({ length: closeUps }, (_, step): ShiftShot[] => {
    const placed = positions[step];
    const last = step === closeUps - 1;
    const hold = Math.max(0, slots[step] - (last ? 0 : 2 * zoom + shift));
    const focus = centreOf(placed)?.id;
    const legs: ShiftShot[] = [{ ms: hold, focus, frame: () => ({ camera: close, place: at(placed) }) }];
    if (step < shifts.length) {
      const move = shifts[step];
      legs.push(
        { ms: zoom, frame: (t) => ({ camera: out(snap(t)), place: at(placed) }) },
        {
          ms: shift,
          frame: (t) => ({
            camera: far,
            place: (cell) => {
              const point = placed.get(cell);
              return point ? bounds(apply(point, move, whip(t))) : hidden;
            },
          }),
        },
        { ms: zoom, frame: (t) => ({ camera: into(snap(t)), place: at(positions[step + 1]) }) },
      );
    }
    return legs;
  }).flat();
  if (driftAfter === 0) {
    return loop;
  }
  const final = positions[closeUps - 1];
  return [
    ...loop,
    { ms: zoom, frame: (t) => ({ camera: out(snap(t)), place: at(final) }) },
    drifting(final, driftAfter, drift || 0.2),
  ];
};
