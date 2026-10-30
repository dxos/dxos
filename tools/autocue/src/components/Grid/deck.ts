//
// Copyright 2026 DXOS.org
//

import { fitBounds, interpolateCamera } from '@dxos/react-ui-canvas';
import { type Bounds, type Size } from '@dxos/scene';

import {
  type Cell,
  type Decor,
  DISTANCES,
  type ShiftShot,
  fastLine,
  hash,
  lineSpeed,
  snap,
  whip,
  wrap,
} from './reveal.ts';

/** Scene units between regions and between planks: drawn in the separator colour, as Composer's hairlines. */
const SEPARATOR = 4;

const L0 = { x: 0, width: 64 };
const NAVTREE = { x: L0.x + L0.width + SEPARATOR, width: 276 };
const PLANKS = { x: NAVTREE.x + NAVTREE.width + SEPARATOR, width: 480 + SEPARATOR + 960 + SEPARATOR + 480 };
const COMPANION = { x: PLANKS.x + PLANKS.width + SEPARATOR, width: 360 };
const RAIL = { x: COMPANION.x + COMPANION.width + SEPARATOR, width: 48 };

/** A plank section: a header strip over a 16:9 clip. */
const HEADER = 40;
const SECTION = HEADER + 540;
const HEIGHT = 3 * SECTION + 2 * SEPARATOR;
const WIDTH = RAIL.x + RAIL.width;

/** The plank in the centre of the deck, where every close-up lands: wide; the planks either side are half as wide. */
const FOCAL = 960;
const SIDE = 480;

/** Plank columns and sections on the torus: three of each are in view, the rest wait beyond the planks' edges. */
const PLANK_COLS = 5;
const PLANK_ROWS = 5;
/** Navtree and companion cells on their own loops: three and two in view. */
const NAVTREE_CELLS = 5;
const COMPANION_CELLS = 4;

/** Left edge and width of plank slot `slot` (0 is the centre), for an integer slot. */
const slotAt = (slot: number) =>
  slot === 0
    ? { x: PLANKS.x + SIDE + SEPARATOR, width: FOCAL }
    : slot > 0
      ? { x: PLANKS.x + SIDE + SEPARATOR + FOCAL + SEPARATOR + (slot - 1) * (SIDE + SEPARATOR), width: SIDE }
      : { x: PLANKS.x + (slot + 1) * (SIDE + SEPARATOR), width: SIDE };

/** A plank slot's left edge and width for a slot partway between two, so a plank widens as it slides into the centre. */
const slotBetween = (slot: number) => {
  const below = Math.floor(slot);
  const t = slot - below;
  const [from, to] = [slotAt(below), slotAt(below + 1)];
  return { x: from.x + (to.x - from.x) * t, width: from.width + (to.width - from.width) * t };
};

const region = ({ x, width }: { x: number; width: number }): Bounds => ({ x, y: 0, width, height: HEIGHT });

const HUES = ['bg-sky-bg', 'bg-amber-bg', 'bg-emerald-bg', 'bg-rose-bg', 'bg-violet-bg', 'bg-teal-bg', 'bg-orange-bg'];
const RAIL_ICONS = [
  'ph--chat-circle-text--regular',
  'ph--info--regular',
  'ph--clock-counter-clockwise--regular',
  'ph--users--regular',
  'ph--gear--regular',
];

/** The console's static shapes: the separator ground, each region's panel, the space avatars and the rail's icons. */
const DECOR: Decor[] = [
  { bounds: { x: 0, y: 0, width: WIDTH, height: HEIGHT }, className: 'bg-separator' },
  ...[L0, NAVTREE, PLANKS, COMPANION, RAIL].map((column) => ({ bounds: region(column), className: 'bg-base-surface' })),
  ...Array.from({ length: 12 }, (_, index) => ({
    bounds: { x: L0.x + 10, y: 14 + index * 56, width: 44, height: 44 },
    className: HUES[index % HUES.length],
    radius: 10,
  })),
  ...RAIL_ICONS.map((icon, index) => ({
    bounds: { x: RAIL.x + 10, y: 16 + index * 52, width: 28, height: 28 },
    className: 'text-fg-muted',
    icon,
  })),
];

export type DeckOptions = {
  cells: Cell[];
  /** The close-ups in order; each is seeded so it lands in the centre plank's middle section on its turn. */
  sequence: Cell[];
  /** Each close-up's slot, landing to landing, in ms; the last is all hold. */
  slots: number[];
  viewport: Size;
  zoom: number;
  shift: number;
  /** Cells each shift moves: 1 or 2, or 0 to vary it. */
  distance: number;
};

type Point = { x: number; y: number };

/**
 * The console loop: the wall is laid out as one giant Composer window — L0 rail, navtree, three planks (the centre one
 * wide), companion and right rail — and runs the shift loop on it. A close-up fills the frame with the centre plank's
 * middle section; the camera snaps out to the whole console (about three plank widths, the 3x3 limit); the planks
 * shift — on even cycles the deck scrolls sideways, on odd ones the plank stacks scroll up and down in alternate
 * directions — while the navtree and companion cells slide vertically in opposite directions; the camera snaps in on
 * the section now in the centre.
 */
export const deckShots = ({ cells, sequence, slots, viewport, zoom, shift, distance }: DeckOptions): ShiftShot[] => {
  const closeUps = Math.max(1, slots.length);
  const shifts = Array.from({ length: closeUps - 1 }, (_, step) => ({
    axis: step % 2 === 0 ? ('deck' as const) : ('stack' as const),
    by: distance === 1 || distance === 2 ? distance : DISTANCES[step % DISTANCES.length],
    fast: fastLine(step),
  }));
  const wrapX = (x: number) => wrap(x, -Math.floor(PLANK_COLS / 2), PLANK_COLS);
  const wrapY = (y: number) => wrap(y, -Math.floor(PLANK_ROWS / 2), PLANK_ROWS);
  /** A stack's direction: the centre plank scrolls up, the planks either side down. */
  const direction = (x: number) => (Math.abs(Math.round(x)) % 2 === 1 ? 1 : -1);
  // Sideways, the deck scrolls as if to the right, so planks move left.
  const apply = (point: Point, { axis, by, fast }: (typeof shifts)[number], t = 1): Point =>
    axis === 'deck'
      ? { x: wrapX(point.x - by * t), y: point.y }
      : { x: point.x, y: wrapY(point.y + direction(point.x) * lineSpeed(point.x, fast) * by * t) };
  const unapply = (point: Point, { axis, by, fast }: (typeof shifts)[number]): Point =>
    axis === 'deck'
      ? { x: wrapX(point.x + by), y: point.y }
      : { x: point.x, y: wrapY(point.y - direction(point.x) * lineSpeed(point.x, fast) * by) };

  // Seed each close-up where the shifts before its turn carry it into the centre; the rest fill in a fixed shuffle.
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
  const planks = new Map<Cell, Point>();
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      const cell = seed.get(key({ x, y })) ?? rest.shift();
      if (cell) {
        planks.set(cell, { x, y });
      }
    }
  }
  const navtree = new Map(rest.splice(0, NAVTREE_CELLS).map((cell, index) => [cell, index - 2]));
  const companion = new Map(rest.splice(0, COMPANION_CELLS).map((cell, index) => [cell, index - 1]));

  const positions: Map<Cell, Point>[] = [planks];
  for (const step of shifts) {
    const previous = positions[positions.length - 1];
    positions.push(new Map([...previous].map(([cell, point]) => [cell, apply(point, step)])));
  }

  const plankBounds = ({ x, y }: Point): Bounds => {
    const { x: left, width } = slotBetween(x);
    return { x: left, y: (y + 1) * (SECTION + SEPARATOR), width, height: SECTION };
  };
  const navtreeHeight = (HEIGHT - 2 * SEPARATOR) / 3;
  const companionHeight = (HEIGHT - SEPARATOR) / 2;
  const hidden: Bounds = { x: WIDTH * 4, y: 0, width: 100, height: 100 };

  /** Every cell's bounds after `step` shifts, `t` of the way through the next one. */
  const place = (step: number, t: number) => {
    const move = shifts[step];
    // The side columns shift on every cycle by the same distance, the navtree down and the companion up.
    const by = (index: number) => shifts.slice(0, index).reduce((sum, shift) => sum + shift.by, 0);
    const along = by(step) + (move ? move.by * t : 0);
    return (cell: Cell): Bounds => {
      const point = positions[step].get(cell);
      if (point) {
        return plankBounds(move && t > 0 ? apply(point, move, t) : point);
      }
      const nav = navtree.get(cell);
      if (nav !== undefined) {
        const slot = wrap(nav + along, -2.5, NAVTREE_CELLS);
        return {
          x: NAVTREE.x,
          y: (slot + 1) * (navtreeHeight + SEPARATOR),
          width: NAVTREE.width,
          height: navtreeHeight,
        };
      }
      const comp = companion.get(cell);
      if (comp !== undefined) {
        const slot = wrap(comp - along, -1.5, COMPANION_CELLS);
        return {
          x: COMPANION.x,
          y: slot * (companionHeight + SEPARATOR),
          width: COMPANION.width,
          height: companionHeight,
        };
      }
      return hidden;
    };
  };
  const clip = (cell: Cell) =>
    planks.has(cell)
      ? region(PLANKS)
      : navtree.has(cell)
        ? region(NAVTREE)
        : companion.has(cell)
          ? region(COMPANION)
          : undefined;
  const meta = (cell: Cell) =>
    planks.has(cell)
      ? { header: { title: cell.label, icon: 'ph--file-text--regular', ratio: HEADER / SECTION } }
      : navtree.has(cell)
        ? { align: 'left' as const }
        : companion.has(cell)
          ? { align: 'right' as const }
          : undefined;

  const focal = { x: slotAt(0).x, y: SECTION + SEPARATOR + HEADER, width: FOCAL, height: 540 };
  const near = fitBounds(focal, viewport);
  const far = fitBounds({ x: 0, y: 0, width: WIDTH, height: HEIGHT }, viewport, 40);
  const out = interpolateCamera(near, far, viewport);
  const into = interpolateCamera(far, near, viewport);
  const centreOf = (placed: Map<Cell, Point>) => [...placed].find(([, point]) => point.x === 0 && point.y === 0)?.[0];
  const base = { clip, meta, decor: DECOR };

  return Array.from({ length: closeUps }, (_, step): ShiftShot[] => {
    const last = step === closeUps - 1;
    const hold = Math.max(0, slots[step] - (last ? 0 : 2 * zoom + shift));
    const at = place(step, 0);
    const legs: ShiftShot[] = [
      { ms: hold, focus: centreOf(positions[step])?.id, frame: () => ({ camera: near, place: at, ...base }) },
    ];
    if (!last) {
      const after = place(step + 1, 0);
      legs.push(
        { ms: zoom, frame: (t) => ({ camera: out(snap(t)), place: at, ...base }) },
        { ms: shift, frame: (t) => ({ camera: far, place: place(step, whip(t)), ...base }) },
        { ms: zoom, frame: (t) => ({ camera: into(snap(t)), place: after, ...base }) },
      );
    }
    return legs;
  }).flat();
};
