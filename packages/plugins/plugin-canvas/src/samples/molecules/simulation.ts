//
// Copyright 2026 DXOS.org
//

import {
  type AppSlot,
  type Block,
  type DataFlowLayout,
  type HexGrid,
  type Rect,
  appSlots,
  regionsOf,
} from './layout.ts';
import {
  type Hex,
  type Molecule,
  type Point,
  type Random,
  between,
  createRandom,
  generateMolecule,
  hexAdd,
  hexDistance,
  hexKey,
  hexNeighbours,
  hexSubtract,
  hexToPoint,
  pointToHex,
} from './molecule.ts';

/** Where a body lives: a source's well, the hub's lattice, a sink's lattice, or (arriving) an application. */
export type Zone = 'source' | 'hub' | 'sink' | 'app';

/**
 * `forming`: fading in inside its source well; `travelling`: following its route to its sites on a lattice; `docked`:
 * bonded into the lattice; `leaving`: fading out after being evicted.
 */
export type Phase = 'forming' | 'travelling' | 'docked' | 'leaving';

/** A molecule in flight or at rest. */
export type Body = {
  id: string;
  /** Spawn order; also what the default subset rule keys on. */
  serial: number;
  molecule: Molecule;
  hue: string;
  /** Index of the source that formed it. */
  source: number;
  zone: Zone;
  phase: Phase;
  /** Where the root atom is. */
  position: Point;
  /** Where the molecule's centre is; a route steers this, not the root. */
  cursor: Point;
  /** Each atom's offset from the root as drawn now; it shifts from `from` to `to` along the route. */
  offsets: readonly Point[];
  opacity: number;
  /** Seconds in the current phase. */
  age: number;
  /** Seconds a forming body waits in its source well before it leaves. */
  dwell: number;
  /** Waypoints still ahead, the last being its root's site. */
  route: Point[];
  /** The gates each leg toward a waypoint needs, aligned with `route`. */
  gates: Gate[][];
  /** Whether it holds every gate its route needs; until then it waits where it is. */
  cleared: boolean;
  /** The route's length when it left, and how far along it the molecule is. */
  distance: number;
  travelled: number;
  /** How far along the route the final drop starts: the molecule keeps its shape until then, and shifts as it bonds. */
  settle: number;
  from: readonly Point[];
  to: readonly Point[];
  /** The lattice sites its atoms take, once it has some. */
  sites?: readonly Hex[];
  /** The shape it takes when it lands; until then it keeps its own bonds, so atoms only ever bond to neighbours. */
  next?: Molecule;
  /** The sites it holds in a source's well. */
  home?: { source: number; sites: readonly Hex[] };
  /** For a sink copy, the hub body it mirrors. */
  origin?: string;
  /** For a hub body, whether a copy of it is synced to the sink. */
  synced?: boolean;
  /** Written by the agent: it flows up the stack, from the sink to the hub and on to its source. */
  authored?: boolean;
  /** The clock slot its first blink takes once it attaches (see `FLICKER_RATE`). */
  blink?: number;
  /** When a docked molecule passes itself on (a sync or a write-back): it settles into its lattice first. */
  handoff?: number;
  /** How far a settled hub molecule has faded from its source's colour to the hub's own, from 0 to 1. */
  tint?: number;
  /** For a sink molecule, which sink (agent) it is in. */
  agent?: number;
  /** For a molecule flowing into an application, the content slot it fills. */
  slot?: number;
  /** For a source molecule, whether the monolithic agent has already taken a copy of it. */
  read?: boolean;
  /** For a hub molecule due to sync, the agent its copy goes to (otherwise a random one at hand-off). */
  syncTo?: number;
};

/** A bond across molecules: how a docked molecule attaches to the edge of the lattice. */
export type LatticeBond = { id: string; zone: 'hub' | 'sink'; from: Point; to: Point; opacity: number };

/** One frame of the simulation as immutable values, so a memoizing renderer sees every change. */
export type Frame = {
  time: number;
  bodies: readonly Body[];
  bonds: readonly LatticeBond[];
  /** Seconds since each active agent appeared, by agent; agents past the end have not appeared yet. */
  agents: readonly number[];
  /** Each application's content, by sink and slot (empty for a sink that is not an application). */
  apps: readonly (readonly (AppItem | undefined)[])[];
};

/** One piece of an application's content, made from a molecule that flowed in: its source's colour, and when it came. */
export type AppItem = { hue: string; source: number; since: number };

export type SimulationOptions = {
  seed?: number;
  /** Seconds between molecules forming in one source, before jitter. */
  interval?: number;
  /** Most molecules waiting in one source well (forming, or set off but not yet out of it) before it forms another. */
  perSource?: number;
  /** Scene units per second along a channel. */
  speed?: number;
  fadeIn?: number;
  /** Seconds a decaying molecule takes to fade out. */
  fadeOut?: number;
  /** Most molecules the hub holds; past it the oldest leaves, so the lattice keeps changing. */
  hubCapacity?: number;
  /** Seconds a molecule stays cached in the hub before it may decay. */
  hubLifetime?: number;
  /** Seconds a molecule stays cached in the sink before it may decay. */
  sinkLifetime?: number;
  /** Seconds between decays in one lattice. */
  decayInterval?: number;
  /** Seconds between molecules the agent writes, before jitter; far longer than `interval`, so less flows up. */
  upInterval?: number;
  /** Chance that an agent-written molecule docked in the hub is written back to its source. */
  writeback?: number;
  /** Molecules that land in the hub before it starts syncing with the sinks. */
  syncAfter?: number;
  /**
   * Agents appear one by one rather than all being there from the start: the first `first` seconds in (once the hub is
   * syncing), then one every `every` seconds until every sink has its agent.
   */
  spawnAgents?: { first: number; every: number };
  /** Starts every application with content already in it, most settled and a little fresh, for a still picture. */
  prefill?: boolean;
  /** Seconds the simulation runs before its first frame, so it opens with its lattices already grown. */
  warmup?: number;
  /** Which hub molecules sync to the sink; every third by default. */
  subset?: (body: Body) => boolean;
};

const DEFAULTS: Required<Omit<SimulationOptions, 'seed' | 'subset' | 'spawnAgents' | 'prefill' | 'warmup'>> = {
  interval: 1.4,
  perSource: 2,
  speed: 240,
  fadeIn: 0.5,
  fadeOut: 1.6,
  hubCapacity: 160,
  hubLifetime: 30,
  sinkLifetime: 20,
  decayInterval: 0.25,
  upInterval: 5,
  writeback: 0.5,
  syncAfter: 10,
};

/** The middle of a molecule's bounding box: the point a route steers, so a molecule runs down a channel's middle. */
const centre = (offsets: readonly Point[]): Point => {
  const xs = offsets.map(({ x }) => x);
  const ys = offsets.map(({ y }) => y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
};

const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

/** Least distance between the centres of two moving molecules, in scene units: about two molecules' width. */
const QUEUE_GAP = 72;

/** The unit direction a travelling molecule is heading in, if it is moving. */
const heading = (body: Body): Point | undefined => {
  const [next] = body.route;
  if (!next) {
    return undefined;
  }
  const dx = next.x - body.cursor.x;
  const dy = next.y - body.cursor.y;
  const length = Math.hypot(dx, dy);
  return length > 1e-6 ? { x: dx / length, y: dy / length } : undefined;
};

/** The site of `grid` nearest `point`, so a molecule formed there sits on the lattice. */
const snap = (grid: HexGrid, point: Point): Point =>
  add(
    grid.origin,
    hexToPoint(pointToHex({ x: point.x - grid.origin.x, y: point.y - grid.origin.y }, grid.spacing), grid.spacing),
  );

/**
 * A stretch of shared track a molecule must hold to move along it: a channel (`from`..`to` is the whole of it), or a
 * span of a lane in scene x. `direction` is which way it moves; molecules going the same way may share a stretch.
 */
type Gate = { track: string; from: number; to: number; direction: number; period?: number };

/** Whether two stretches of one track overlap; on a circular track (`period`) a stretch may wrap round. */
const overlaps = (a: Gate, b: Gate): boolean => {
  const shifts = a.period === undefined ? [0] : [-a.period, 0, a.period];
  return shifts.some((shift) => a.from <= b.to + shift && b.from + shift <= a.to);
};

/** A waypoint, and the gate (or gates) the leg toward it needs. */
type Leg = { point: Point; gate?: Gate; gates?: readonly Gate[] };

/** The whole of a channel, taken inward (towards the hub, or down to the sink) or outward. */
const channelGate = (channel: number, direction: number): Gate => ({
  track: `channel-${channel}`,
  from: 0,
  to: 1,
  direction,
});

/**
 * The span of a lane between two x positions, padded by half a gap so molecules at its ends do not overlap. Its
 * direction is both the way along the lane and the way between lane and band (`vertical`), so a molecule dropping onto
 * the band never shares a span with one rising off it.
 */
const laneGate = (side: 'top' | 'bottom', from: number, to: number, vertical: 'down' | 'up'): Gate => ({
  track: `lane-${side}`,
  from: Math.min(from, to) - QUEUE_GAP / 2,
  to: Math.max(from, to) + QUEUE_GAP / 2,
  direction: (to >= from ? 1 : -1) * (vertical === 'down' ? 1 : 2),
});

/** Legs from `start` to `end` with a right-angled corner, moving along `first` before the other axis. */
const square = (start: Point, end: Point, first: 'x' | 'y', gate?: Gate): Leg[] => {
  const corner = first === 'x' ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
  return [
    { point: corner, gate },
    { point: end, gate },
  ];
};

/** The signed angle from `from` to `to`, the short way round. */
const turn = (from: number, to: number): number => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** Points along the circle of `radius` about `origin` from angle `from` to `to`, the short way round, ending at `to`. */
const arc = (origin: Point, radius: number, from: number, to: number): Point[] => {
  const delta = turn(from, to);
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 24)));
  return Array.from({ length: steps }, (_, index) => {
    const angle = from + (delta * (index + 1)) / steps;
    return { x: origin.x + radius * Math.cos(angle), y: origin.y + radius * Math.sin(angle) };
  });
};

/** The stretch of a round hub's inner ring between two angles, padded by half a gap at `radius`. */
const ringGate = (from: number, to: number, radius: number): Gate => {
  const end = from + turn(from, to);
  const pad = QUEUE_GAP / 2 / radius;
  return {
    track: 'ring',
    from: Math.min(from, end) - pad,
    to: Math.max(from, end) + pad,
    direction: end >= from ? 1 : -1,
    period: 2 * Math.PI,
  };
};

/**
 * Clock slots per second; a blink dims one odd slot. Read off the simulation clock, so every attaching molecule blinks
 * in step.
 */
const FLICKER_RATE = 8;

/** Blinks a molecule gives as it attaches. */
const BLINKS = 3;

/** How full the hub is when it starts decaying at its full rate. */
const HUB_HALF = 0.5;

/** Until then the hub decays on one tick in this many. */
const SLOW_DECAY = 16;

/** Seconds after docking a hub molecule starts losing its colour (once it has blinked), and how long that takes. */
const TINT_DELAY = 1;
const TINT_TIME = 1.5;

/** The share of source molecules the monolithic agent takes a copy of. */
const AGENT_READS = 0.5;

/** Seconds a new agent takes to fade in; its catch-up sync starts once it has. */
export const AGENT_FADE = 0.8;

/** Settled hub molecules a new agent pulls down as it catches up, and the seconds between them. */
const CATCH_UP = 6;
const CATCH_UP_STAGGER = 0.8;

/** Seconds a docked molecule settles before it passes itself on. */
const HANDOFF_DELAY = { min: 3, max: 8 };

/** The step a warm-up runs at: one frame at 30 frames a second. */
const WARMUP_STEP = 1 / 30;

/** Longest frame step the simulation takes, so a backgrounded tab does not teleport everything on return. */
const MAX_STEP = 1 / 20;

type Occupant = { body: string; atom: number };
type CrystalBond = { id: string; from: Hex; to: Hex; bodies: readonly [string, string] };
/** Where a molecule's atoms land (in atom order; its bonds bend to fit but never change), and its attaching bond. */
type Placement = {
  sites: Hex[];
  bond?: { from: Hex; to: Hex; body: string };
};

/** Bent variants tried from each edge site, beside the molecule's own shape. */
const BENDS = 3;

const pathLength = (start: Point, route: readonly Point[]): number =>
  route.reduce(
    ({ total, previous }, point) => ({
      total: total + Math.hypot(point.x - previous.x, point.y - previous.y),
      previous: point,
    }),
    { total: 0, previous: start },
  ).total;

/**
 * How a lattice grows: `blob` outward from its centre; `band` along the horizontal centre line, seeded under each
 * channel that feeds it, so the molecules spread evenly from left to right.
 */
export type CrystalShape = 'blob' | 'band';

/** Lattice steps around a band seed that must be empty before another seed may start there. */
const SEED_CLEARANCE = 3;

/** Rows a band keeps empty above and below it, so it reads as a band rather than filling its well. */
const BAND_MARGIN_ROWS = 2;

/** Lattice steps around a placement counted as its neighbourhood when scoring crowding. */
const CROWD_RADIUS = 2;

/**
 * A growing lattice of molecules on one block's hex grid. The first molecule takes the centre; every later one takes
 * free sites touching the occupied ones and bonds to a neighbour there, so the lattice grows from its edge.
 */
class Crystal {
  readonly grid: HexGrid;
  readonly #shape: CrystalShape;
  /** The rows sites may take, inclusive. */
  readonly #rows: { min: number; max: number };
  readonly #sites = new Map<string, Occupant>();
  #bonds: CrystalBond[] = [];
  /** How many sites the lattice may take in all; counted once, on first use. */
  #capacity?: number;

  /** For a partitioned well, the regions its sites must fall in: one per bucket. */
  readonly #regions?: readonly Rect[];

  constructor(grid: HexGrid, shape: CrystalShape, regions?: readonly Rect[]) {
    this.grid = grid;
    this.#shape = shape;
    this.#regions = regions;
    const height = (grid.spacing * Math.sqrt(3)) / 2;
    // A partitioned well's buckets sit between horizontal channels, which take the place of the band's empty rows.
    const margin = shape === 'band' && !regions ? BAND_MARGIN_ROWS : 0;
    this.#rows = {
      min: Math.ceil((grid.bounds.y - grid.origin.y) / height) + margin,
      max: Math.floor((grid.bounds.y + grid.bounds.height - grid.origin.y) / height) - margin,
    };
  }

  get bonds(): readonly CrystalBond[] {
    return this.#bonds;
  }

  /**
   * This lattice on the same grid with new `regions`: each body in `moves` is carried that many sites along with its
   * bonds, the rest keep their sites. Of those, each in `checked` (on its way, its sites only reserved) keeps them only if
   * they are still free and inside a region; the bodies that lose theirs are returned, for the caller to send away.
   */
  rebuilt(
    regions: readonly Rect[] | undefined,
    moves: ReadonlyMap<string, Hex>,
    checked: ReadonlySet<string> = new Set(),
  ): { crystal: Crystal; displaced: string[] } {
    const crystal = new Crystal(this.grid, this.#shape, regions);
    const byBody = new Map<string, { site: Hex; occupant: Occupant }[]>();
    for (const [key, occupant] of this.#sites) {
      const [q, r] = key.split(',').map(Number);
      const move = moves.get(occupant.body);
      const site = move ? { q: q + move.q, r: r + move.r } : { q, r };
      byBody.set(occupant.body, [...(byBody.get(occupant.body) ?? []), { site, occupant }]);
    }
    const moveOf = (body: string) => {
      const move = moves.get(body);
      return move ? `${move.q},${move.r}` : '';
    };
    // A reservation bonded to a body that moved away would land bonded to nothing.
    const stranded = (body: string) =>
      this.#bonds.some((bond) => bond.bodies.includes(body) && moveOf(bond.bodies[0]) !== moveOf(bond.bodies[1]));
    // Settled bodies first, so a reservation is tested against where they now sit.
    const ordered = [...byBody].sort(([a], [b]) => Number(checked.has(a)) - Number(checked.has(b)));
    const displaced: string[] = [];
    for (const [body, sites] of ordered) {
      if (checked.has(body) && (stranded(body) || !sites.every(({ site }) => crystal.#free(site)))) {
        displaced.push(body);
        continue;
      }
      sites.forEach(({ site, occupant }) => crystal.#sites.set(hexKey(site), occupant));
    }
    const step = (site: Hex, body: string): Hex => {
      const move = moves.get(body);
      return move ? { q: site.q + move.q, r: site.r + move.r } : site;
    };
    // A bond survives only with both its bodies, carried the same way.
    crystal.#bonds = this.#bonds
      .filter(
        (bond) =>
          !bond.bodies.some((body) => displaced.includes(body)) && moveOf(bond.bodies[0]) === moveOf(bond.bodies[1]),
      )
      .map((bond) => ({ ...bond, from: step(bond.from, bond.bodies[0]), to: step(bond.to, bond.bodies[0]) }));
    return { crystal, displaced };
  }

  /** The share of the lattice's usable sites taken, from 0 to 1. */
  get fill(): number {
    if (this.#capacity === undefined) {
      const { bounds, spacing } = this.grid;
      const columns = Math.ceil(bounds.width / spacing) + (this.#rows.max - this.#rows.min);
      let count = 0;
      for (let r = this.#rows.min; r <= this.#rows.max; r++) {
        for (let q = -columns; q <= columns; q++) {
          if (this.#free({ q, r })) {
            count++;
          }
        }
      }
      this.#capacity = count + this.#sites.size;
    }
    return this.#capacity > 0 ? this.#sites.size / this.#capacity : 1;
  }

  position(site: Hex): Point {
    const offset = hexToPoint(site, this.grid.spacing);
    return { x: this.grid.origin.x + offset.x, y: this.grid.origin.y + offset.y };
  }

  /**
   * The best place for `molecule` on a free edge site (or a fresh seed, while nothing is near one). A molecule never
   * turns and keeps its bonds: it lands in its own shape, or bends at its bonds (each still joining lattice neighbours)
   * to fill a gap. Scored by the lattice's shape, by closeness to `aim` (the section the molecule is headed for), by how
   * snugly it fits among its neighbours, and by how far its atoms had to move.
   */
  place(molecule: Molecule, aim: Point, random: Random): Placement | undefined {
    const seed = this.#seed(aim);
    const anchors = [...(seed ? [seed] : []), ...this.#frontier()];
    const { spacing } = this.grid;
    let best: { placement: Placement; score: number } | undefined;
    const consider = (sites: Hex[], anchor: Hex, pivot: number) => {
      if (!sites.every((site) => this.#free(site))) {
        return;
      }
      const bond = this.#attachment(sites);
      if (!bond && anchor !== seed) {
        return;
      }
      // How far the atoms moved from their places in the molecule's own shape, pinned at the pivot.
      const shift = sites.reduce((sum, site, index) => {
        const now = hexToPoint(hexSubtract(site, anchor), spacing);
        const was = hexToPoint(hexSubtract(molecule.atoms[index], molecule.atoms[pivot]), spacing);
        return sum + Math.hypot(now.x - was.x, now.y - was.y);
      }, 0);
      const score =
        this.#score(this.#centroid(sites), aim) +
        (this.#crowding(sites) - 1.5 * this.#contacts(sites)) * spacing +
        0.5 * shift +
        random() * spacing * 2;
      if (!best || score < best.score) {
        best = { placement: { sites, bond }, score };
      }
    };
    for (const anchor of anchors) {
      molecule.atoms.forEach((pivot, index) => {
        consider(
          molecule.atoms.map((atom) => hexAdd(anchor, hexSubtract(atom, pivot))),
          anchor,
          index,
        );
      });
      for (let variant = 0; variant < BENDS; variant++) {
        const pivot = Math.floor(random() * molecule.atoms.length);
        const bent = this.#bend(molecule, anchor, pivot, random);
        if (bent) {
          consider(bent, anchor, pivot);
        }
      }
    }
    return best?.placement;
  }

  /**
   * `molecule` laid on free sites with atom `pivot` at `anchor`, walking its bonds outward: each bonded atom takes a free
   * neighbour of its partner's site, preferring one that touches the lattice (to fill a gap) and then its own direction
   * in the molecule. Every bond still joins neighbouring sites. Undefined when an atom finds no room.
   */
  #bend(molecule: Molecule, anchor: Hex, pivot: number, random: Random): Hex[] | undefined {
    if (!this.#free(anchor)) {
      return undefined;
    }
    const sites: (Hex | undefined)[] = molecule.atoms.map(() => undefined);
    sites[pivot] = anchor;
    const taken = new Set([hexKey(anchor)]);
    const queue = [pivot];
    while (queue.length > 0) {
      const atom = queue.shift() ?? pivot;
      const from = sites[atom];
      if (!from) {
        return undefined;
      }
      for (const [a, b] of molecule.bonds) {
        const partner = a === atom ? b : b === atom ? a : undefined;
        if (partner === undefined || sites[partner]) {
          continue;
        }
        const own = hexSubtract(molecule.atoms[partner], molecule.atoms[atom]);
        let choice: { site: Hex; score: number } | undefined;
        for (const site of hexNeighbours(from)) {
          if (taken.has(hexKey(site)) || !this.#free(site)) {
            continue;
          }
          const step = hexSubtract(site, from);
          const score = this.#contacts([site]) + (step.q === own.q && step.r === own.r ? 1 : 0) + random() * 0.8;
          if (!choice || score > choice.score) {
            choice = { site, score };
          }
        }
        if (!choice) {
          return undefined;
        }
        sites[partner] = choice.site;
        taken.add(hexKey(choice.site));
        queue.push(partner);
      }
    }
    const placed = sites.filter((site) => site !== undefined);
    return placed.length === sites.length ? placed : undefined;
  }

  /** Occupied sites touching `sites`: the more, the more snugly a molecule fills its gap. */
  #contacts(sites: readonly Hex[]): number {
    const touching = new Set<string>();
    for (const site of sites) {
      for (const neighbour of hexNeighbours(site)) {
        if (this.#sites.has(hexKey(neighbour))) {
          touching.add(hexKey(neighbour));
        }
      }
    }
    return touching.size;
  }

  /** Occupied sites near `sites`: a penalty that spreads molecules out rather than piling them where traffic arrives. */
  #crowding(sites: readonly Hex[]): number {
    if (this.#shape !== 'band') {
      return 0;
    }
    const near = new Set<string>();
    for (const site of sites) {
      for (let q = -CROWD_RADIUS; q <= CROWD_RADIUS; q++) {
        for (let r = -CROWD_RADIUS; r <= CROWD_RADIUS; r++) {
          const neighbour = { q: site.q + q, r: site.r + r };
          if (hexDistance({ q, r }) <= CROWD_RADIUS && this.#sites.has(hexKey(neighbour))) {
            near.add(hexKey(neighbour));
          }
        }
      }
    }
    return near.size;
  }

  /** Lower is better. */
  #score(middle: Point, aim: Point): number {
    const { origin } = this.grid;
    switch (this.#shape) {
      case 'blob':
        return (
          Math.hypot(middle.x - origin.x, middle.y - origin.y) + 0.35 * Math.hypot(middle.x - aim.x, middle.y - aim.y)
        );
      case 'band':
        // Hug the centre line, near the section the molecule aims at.
        return Math.abs(middle.y - origin.y) + 0.6 * Math.abs(middle.x - aim.x);
    }
  }

  /** Where a new cluster may start: the centre for an empty blob, or the centre line under `aim` for a band. */
  #seed(aim: Point): Hex | undefined {
    if (this.#shape === 'blob') {
      return this.#sites.size === 0 ? { q: 0, r: 0 } : undefined;
    }
    const seed = pointToHex({ x: aim.x - this.grid.origin.x, y: 0 }, this.grid.spacing);
    for (const key of this.#sites.keys()) {
      const [q, r] = key.split(',').map(Number);
      if (hexDistance(hexSubtract({ q, r }, seed)) <= SEED_CLEARANCE) {
        return undefined;
      }
    }
    return seed;
  }

  /** How many unoccupied sites border `sites`: the more, the nearer the lattice's edge. */
  exposure(sites: readonly Hex[]): number {
    const open = new Set<string>();
    for (const site of sites) {
      for (const neighbour of hexNeighbours(site)) {
        if (!this.#sites.has(hexKey(neighbour))) {
          open.add(hexKey(neighbour));
        }
      }
    }
    return open.size;
  }

  /** Takes the placement's sites for `body` and records its attaching bond. */
  occupy(body: string, placement: Placement): void {
    placement.sites.forEach((site, atom) => this.#sites.set(hexKey(site), { body, atom }));
    if (placement.bond) {
      this.#bonds.push({
        id: `${body}:${placement.bond.body}`,
        from: placement.bond.from,
        to: placement.bond.to,
        bodies: [body, placement.bond.body],
      });
    }
  }

  /** The molecules bonded to `body`. */
  partners(body: string): string[] {
    return this.#bonds.flatMap((bond) =>
      bond.bodies.includes(body) ? bond.bodies.filter((other) => other !== body) : [],
    );
  }

  /** Frees `body`'s sites and drops every bond touching it; answers the molecules left with no bond at all. */
  release(body: string, sites: readonly Hex[]): string[] {
    for (const site of sites) {
      if (this.#sites.get(hexKey(site))?.body === body) {
        this.#sites.delete(hexKey(site));
      }
    }
    const partners = this.#bonds.flatMap((bond) =>
      bond.bodies.includes(body) ? bond.bodies.filter((other) => other !== body) : [],
    );
    this.#bonds = this.#bonds.filter((bond) => !bond.bodies.includes(body));
    return partners.filter((partner) => !this.#bonds.some((bond) => bond.bodies.includes(partner)));
  }

  #free(site: Hex): boolean {
    if (this.#sites.has(hexKey(site)) || site.r < this.#rows.min || site.r > this.#rows.max) {
      return false;
    }
    const { x, y } = this.position(site);
    const { bounds, origin, radius } = this.grid;
    if (radius !== undefined && Math.hypot(x - origin.x, y - origin.y) > radius) {
      return false;
    }
    if (
      this.#regions &&
      !this.#regions.some(
        (region) => x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height,
      )
    ) {
      return false;
    }
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
  }

  /** Free sites next to an occupied one: the lattice's growing edge. */
  #frontier(): Hex[] {
    const frontier = new Map<string, Hex>();
    for (const key of this.#sites.keys()) {
      const [q, r] = key.split(',').map(Number);
      for (const neighbour of hexNeighbours({ q, r })) {
        if (this.#free(neighbour)) {
          frontier.set(hexKey(neighbour), neighbour);
        }
      }
    }
    return [...frontier.values()];
  }

  /** A bond from one of `sites` to an occupied neighbour, if any touches the lattice. */
  #attachment(sites: readonly Hex[]): Placement['bond'] {
    for (const site of sites) {
      for (const neighbour of hexNeighbours(site)) {
        const occupant = this.#sites.get(hexKey(neighbour));
        if (occupant) {
          return { from: site, to: neighbour, body: occupant.body };
        }
      }
    }
    return undefined;
  }

  #centroid(sites: readonly Hex[]): Point {
    const points = sites.map((site) => this.position(site));
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
  }
}

/**
 * Molecules form in the source wells, flow down their channels and settle onto the hub's hexagonal lattice, attaching to
 * its edge, so the colours mix as it grows; once the hub holds a few, a subset of the docked molecules sync a copy down
 * to the sink's lattice. Less often the agent writes a molecule into the sink, which syncs up to the hub and, sometimes,
 * back to its source. Both lattices are caches that decay from their edges.
 *
 * Moving molecules never overlap: before it sets off, a molecule reserves every channel and stretch of lane on its route
 * at once (see {@link Gate}), so traffic the other way waits, while traffic the same way follows at a distance.
 */
export class DataFlowSimulation {
  #layout: DataFlowLayout;
  readonly #options: typeof DEFAULTS;
  readonly #spawnAgents?: { first: number; every: number };
  readonly #subset: (body: Body) => boolean;
  readonly #random: Random;
  #hub: Crystal;
  /** One lattice per sink, by agent; an application has none. */
  readonly #sinks: (Crystal | undefined)[];
  /** Each application's content slots and what fills them, by sink. */
  readonly #apps: { slots: readonly AppSlot[]; items: (AppItem | undefined)[]; reserved: Set<number> }[];
  /** When each agent appeared, by agent; only the first `#agents` have. */
  readonly #agentSince: number[];
  #agents: number;
  #nextAgent = 0;
  readonly #nextSpawn: number[];
  /** The sites each source's molecules take in its well, by source, so they sit apart on its grid. */
  readonly #homes: Map<string, string>[];
  /** The gates held on each track, by track. */
  readonly #tracks = new Map<string, { body: string; gate: Gate }[]>();
  #nextUp: number;
  #nextDecay = 0;
  #decays = 0;
  /** Distinct directions for exclusive gates, so no two molecules ever share one. */
  #ticket = 0;
  #landed = 0;
  #bodies: Body[] = [];
  #time = 0;
  #serial = 0;

  #agentReads = true;

  /**
   * Splits the hub into `target`'s buckets: each docked molecule `plan` keeps moves by its shift (whole lattice steps),
   * taking its sites and bonds along, and each it drops decays; what arrives from now on lands in the new buckets.
   */
  split(target: Block, plan: ReadonlyMap<string, { shift: Point; kept: boolean }>): void {
    const { spacing } = this.#layout.hubGrid;
    const row = (spacing * Math.sqrt(3)) / 2;
    const moves = new Map<string, Hex>();
    for (const body of this.#bodies) {
      const move = plan.get(body.id);
      if (!move || body.zone !== 'hub' || body.phase !== 'docked') {
        continue;
      }
      if (!move.kept) {
        this.#evict(body);
        continue;
      }
      const r = Math.round(move.shift.y / row);
      const step = { q: Math.round(move.shift.x / spacing - r / 2), r };
      moves.set(body.id, step);
      body.position = { x: body.position.x + move.shift.x, y: body.position.y + move.shift.y };
      body.sites = body.sites?.map((site) => ({ q: site.q + step.q, r: site.r + step.r }));
    }
    // A molecule already on its way keeps the place it was given if that is still good in the new buckets; one whose
    // place fell in a gutter, or under a cluster that moved, fades where it is.
    const inFlight = new Set(
      this.#bodies.filter((body) => body.zone === 'hub' && body.phase === 'travelling').map((body) => body.id),
    );
    const { crystal, displaced } = this.#hub.rebuilt(target.buckets && regionsOf(target.buckets), moves, inFlight);
    this.#hub = crystal;
    for (const body of this.#bodies.filter((body) => displaced.includes(body.id))) {
      this.#releaseAll(body);
      body.sites = undefined;
      body.phase = 'leaving';
      body.age = 0;
      body.route = [];
    }
    this.#layout = { ...this.#layout, hub: target };
  }

  /** Merges a split hub back into `hub`'s one region; every molecule stays where it is, which that region holds. */
  merge(hub: Block): void {
    this.#hub = this.#hub.rebuilt(hub.buckets && regionsOf(hub.buckets), new Map()).crystal;
    this.#layout = { ...this.#layout, hub };
  }

  /** Whether the monolithic agent reads the sources; off, it is not yet in the picture and takes nothing. */
  get agentReads(): boolean {
    return this.#agentReads;
  }

  /** Turned off, the agent leaves the picture: what it holds, and what is on its way to it, fades out. */
  set agentReads(on: boolean) {
    if (on === this.#agentReads) {
      return;
    }
    this.#agentReads = on;
    if (on || !this.#layout.monolith) {
      return;
    }
    for (const body of this.#bodies) {
      if (body.zone === 'hub' && body.phase === 'docked') {
        this.#evict(body);
      } else if (body.zone === 'hub' && body.phase === 'travelling') {
        this.#releaseAll(body);
        body.phase = 'leaving';
        body.age = 0;
        body.route = [];
      }
    }
  }

  constructor(
    layout: DataFlowLayout,
    { seed, subset, spawnAgents, prefill, warmup = 0, ...options }: SimulationOptions = {},
  ) {
    this.#layout = layout;
    this.#options = { ...DEFAULTS, ...options };
    this.#spawnAgents = spawnAgents;
    this.#subset = subset ?? ((body) => body.serial % 3 === 0);
    this.#random = createRandom(seed);
    this.#hub = new Crystal(
      layout.hubGrid,
      layout.hub.round || layout.monolith ? 'blob' : 'band',
      layout.hub.buckets && regionsOf(layout.hub.buckets),
    );
    this.#sinks = layout.sinks.map((sink, index) =>
      sink.app ? undefined : new Crystal(layout.sinkGrids[index], 'blob'),
    );
    this.#apps = layout.sinks.map((sink) => {
      const slots = appSlots(sink);
      return { slots, items: slots.map(() => undefined), reserved: new Set<number>() };
    });
    if (prefill) {
      this.#prefill();
    }
    // Without spawning, every agent is there from the start (and long enough ago to be drawn in full).
    this.#agents = spawnAgents ? 0 : layout.sinks.length;
    this.#agentSince = layout.sinks.map(() => -AGENT_FADE);
    this.#homes = layout.sources.map(() => new Map());
    // Staggered, so the sources do not all form their first molecule on the same frame.
    this.#nextSpawn = layout.sources.map(() => this.#random() * this.#options.interval);
    this.#nextUp = this.#options.upInterval * (1 + this.#random());
    // Last, once everything the simulation steps through is set up.
    for (let elapsed = 0; elapsed < warmup; elapsed += WARMUP_STEP) {
      this.step(WARMUP_STEP);
    }
  }

  get time(): number {
    return this.#time;
  }

  get bodies(): readonly Body[] {
    return this.#bodies;
  }

  /** Copies of the current bodies and bonds; the simulation mutates its own in place. */
  frame(): Frame {
    return {
      time: this.#time,
      bodies: this.#bodies.map((body) => ({ ...body, route: [...body.route] })),
      bonds: [...this.latticeBonds('hub'), ...this.latticeBonds('sink')],
      agents: this.#agentSince.slice(0, this.#agents).map((since) => this.#time - since),
      apps: this.#apps.map(({ items }) => items.map((item) => item && { ...item })),
    };
  }

  /** Advances the simulation by `dt` seconds. */
  step(dt: number): void {
    const delta = Math.min(Math.max(dt, 0), MAX_STEP);
    this.#time += delta;
    this.#spawn();
    this.#spawnAgent();
    this.#spawnUp();
    this.#decay();
    for (const body of [...this.#bodies]) {
      body.age += delta;
      switch (body.phase) {
        case 'forming':
          body.opacity = Math.min(1, body.age / this.#options.fadeIn);
          if (body.age >= body.dwell) {
            this.#depart(body);
          }
          break;
        case 'travelling':
          body.opacity = Math.min(1, body.opacity + delta / this.#options.fadeIn);
          if (!body.cleared) {
            body.cleared = this.#acquire(body);
          }
          if (body.cleared && !this.#queued(body) && this.#advance(body, delta * this.#options.speed)) {
            this.#dock(body);
          }
          break;
        case 'leaving':
          body.opacity = Math.max(0, body.opacity - delta / this.#options.fadeOut);
          break;
        case 'docked': {
          if (body.handoff !== undefined && this.#time >= body.handoff) {
            body.handoff = undefined;
            this.#handOff(body);
          }
          // Three blinks as the molecule attaches, then steady.
          const slot = Math.floor(this.#time * FLICKER_RATE);
          const blinking = body.blink !== undefined && slot >= body.blink && slot < body.blink + 2 * BLINKS;
          body.opacity = blinking && slot % 2 === 1 ? 0.3 : 1;
          if (body.zone === 'hub') {
            // Once settled, a hub molecule loses its source's colour: in the hub, data is just data.
            body.tint = Math.min(1, Math.max(0, (body.age - TINT_DELAY) / TINT_TIME));
          }
          break;
        }
      }
    }
    this.#bodies = this.#bodies.filter((body) => {
      const gone = body.phase === 'leaving' && body.opacity <= 0;
      if (gone) {
        this.#leaveHome(body);
      }
      return !gone;
    });
  }

  /** The bonds attaching docked molecules to each other across the hub's lattice, or across every sink's. */
  latticeBonds(zone: 'hub' | 'sink'): LatticeBond[] {
    const crystals = zone === 'hub' ? [this.#hub] : this.#sinks.filter((crystal) => crystal !== undefined);
    const byId = new Map(this.#bodies.map((body) => [body.id, body]));
    return crystals.flatMap((crystal) =>
      crystal.bonds.flatMap((bond) => {
        const [first, second] = bond.bodies.map((id) => byId.get(id));
        if (first?.phase !== 'docked' || second?.phase !== 'docked') {
          return [];
        }
        return [
          {
            id: bond.id,
            zone,
            from: crystal.position(bond.from),
            to: crystal.position(bond.to),
            opacity: Math.min(first.opacity, second.opacity),
          },
        ];
      }),
    );
  }

  /** Whether molecule `id` is bonded to another in its lattice (landed or still on its way). */
  bonded(id: string): boolean {
    return [this.#hub, ...this.#sinks].some((crystal) => crystal !== undefined && crystal.partners(id).length > 0);
  }

  /** The lattice a zone docks into: the hub's, or an agent's sink. */
  #crystal(zone: Zone, agent = 0): Crystal | undefined {
    return zone === 'hub' ? this.#hub : zone === 'sink' ? this.#sinks[agent] : undefined;
  }

  /** An active agent at random, if any has appeared. */
  #anyAgent(): number | undefined {
    return this.#agents > 0 ? Math.floor(this.#random() * this.#agents) : undefined;
  }

  /**
   * Brings in the next agent once the hub is syncing and its time has come. A new agent catches up first: a batch of the
   * hub's settled molecules that no agent holds yet sync down to it, one after another.
   */
  #spawnAgent(): void {
    const spawn = this.#spawnAgents;
    if (!spawn || this.#agents >= this.#layout.sinks.length || this.#landed < this.#options.syncAfter) {
      return;
    }
    if (this.#nextAgent === 0) {
      this.#nextAgent = this.#time + spawn.first;
    }
    if (this.#time < this.#nextAgent) {
      return;
    }
    const agent = this.#agents++;
    this.#agentSince[agent] = this.#time;
    this.#nextAgent = this.#time + spawn.every;
    const unsynced = this.#bodies.filter(
      (body) =>
        body.zone === 'hub' && body.phase === 'docked' && !body.authored && !body.synced && body.handoff === undefined,
    );
    unsynced.slice(0, CATCH_UP).forEach((body, index) => {
      body.syncTo = agent;
      body.handoff = this.#time + AGENT_FADE + index * CATCH_UP_STAGGER;
    });
  }

  #offsets(molecule: Molecule): Point[] {
    return molecule.atoms.map((atom) => hexToPoint(atom, this.#layout.hubGrid.spacing));
  }

  /** A body at rest with no route, ready for its caller to place. */
  #body(
    fields: Pick<Body, 'id' | 'serial' | 'molecule' | 'hue' | 'source' | 'zone' | 'phase' | 'position'> & Partial<Body>,
  ): Body {
    const offsets = fields.offsets ?? this.#offsets(fields.molecule);
    return {
      cursor: { ...fields.position },
      offsets,
      opacity: 0,
      age: 0,
      dwell: 0,
      route: [],
      gates: [],
      cleared: false,
      distance: 0,
      travelled: 0,
      settle: 0,
      from: offsets,
      to: offsets,
      ...fields,
    };
  }

  #spawn(): void {
    this.#layout.sources.forEach((source, index) => {
      if (this.#time < this.#nextSpawn[index]) {
        return;
      }
      const interval = this.#options.interval;
      this.#nextSpawn[index] = this.#time + between(this.#random, 0.7 * interval, 1.3 * interval);
      if (this.#waiting(index) >= this.#options.perSource) {
        return;
      }
      const molecule = generateMolecule(this.#random);
      const serial = this.#serial++;
      const id = `m${serial}`;
      const home = this.#findHome(index, molecule);
      if (!home) {
        return;
      }
      this.#takeHome(index, id, home);
      this.#bodies.push(
        this.#body({
          id,
          serial,
          molecule,
          hue: source.hue,
          source: index,
          zone: 'source',
          phase: 'forming',
          position: home.root,
          home: { source: index, sites: home.sites },
          dwell: between(this.#random, 1.5, 3),
        }),
      );
    });
  }

  /** Molecules from source `index` still in its well: forming, or set off and not yet out of it. */
  #waiting(index: number): number {
    const { well } = this.#layout.sources[index];
    return this.#bodies.filter(
      (body) =>
        body.source === index &&
        !body.authored &&
        (body.phase === 'forming' ||
          (body.phase === 'travelling' &&
            body.cursor.x >= well.x &&
            body.cursor.x <= well.x + well.width &&
            body.cursor.y >= well.y &&
            body.cursor.y <= well.y + well.height)),
    ).length;
  }

  /**
   * A place for `molecule` on the source's grid: every atom inside the well on a free site, and a clear site between it
   * and every other molecule there, so the molecules in a source sit apart on its lattice.
   */
  #findHome(source: number, molecule: Molecule): { root: Point; sites: Hex[] } | undefined {
    const { grid } = this.#layout.sources[source];
    const homes = this.#homes[source];
    const row = (grid.spacing * Math.sqrt(3)) / 2;
    const rows = Math.ceil(grid.bounds.height / row);
    const columns = Math.ceil(grid.bounds.width / grid.spacing) + rows;
    const anchors: Hex[] = [];
    for (let r = -rows; r <= rows; r++) {
      for (let q = -columns; q <= columns; q++) {
        anchors.push({ q, r });
      }
    }
    // A random order, so molecules form all over the well rather than filling it from one corner.
    for (let index = anchors.length - 1; index > 0; index--) {
      const other = Math.floor(this.#random() * (index + 1));
      [anchors[index], anchors[other]] = [anchors[other], anchors[index]];
    }
    for (const anchor of anchors) {
      const sites = molecule.atoms.map((atom) => hexAdd(anchor, atom));
      const fits = sites.every((site) => {
        const point = add(grid.origin, hexToPoint(site, grid.spacing));
        const inside =
          point.x >= grid.bounds.x &&
          point.x <= grid.bounds.x + grid.bounds.width &&
          point.y >= grid.bounds.y &&
          point.y <= grid.bounds.y + grid.bounds.height;
        return inside && [site, ...hexNeighbours(site)].every((near) => !homes.has(hexKey(near)));
      });
      if (fits) {
        return { root: add(grid.origin, hexToPoint(anchor, grid.spacing)), sites };
      }
    }
    return undefined;
  }

  #takeHome(source: number, body: string, home: { sites: readonly Hex[] }): void {
    for (const site of home.sites) {
      this.#homes[source].set(hexKey(site), body);
    }
  }

  #leaveHome(body: Body): void {
    if (!body.home) {
      return;
    }
    const homes = this.#homes[body.home.source];
    for (const site of body.home.sites) {
      if (homes.get(hexKey(site)) === body.id) {
        homes.delete(hexKey(site));
      }
    }
    body.home = undefined;
  }

  /**
   * The hub and the sink are caches: a molecule held past its lifetime decays, the most exposed first, so each lattice
   * wears away from its edge while new molecules keep attaching there.
   */
  #decay(): void {
    if (this.#time < this.#nextDecay) {
      return;
    }
    this.#nextDecay = this.#time + this.#options.decayInterval;
    this.#decays++;
    // The hub decays slowly until it is half full, so its lattice has time to build up before it starts wearing away.
    if (this.#hub.fill >= HUB_HALF || this.#decays % SLOW_DECAY === 0) {
      this.#evictEdge('hub', this.#options.hubLifetime);
    }
    for (let agent = 0; agent < this.#agents; agent++) {
      this.#evictEdge('sink', this.#options.sinkLifetime, agent);
    }
  }

  /** Whether enough has landed in the hub for it to start syncing with the sink. */
  get #syncing(): boolean {
    return this.#landed >= this.#options.syncAfter && this.#agents > 0;
  }

  /** Now and then the agent writes a molecule of its own into the sink, about one of its sources' data. */
  #spawnUp(): void {
    const agent = this.#anyAgent();
    if (agent !== undefined && this.#layout.sinks[agent]?.app) {
      // An app in a silo writes back to its own source; behind a hub, it waits until the hub is syncing.
      if ((this.#layout.silos || this.#syncing) && this.#time >= this.#nextUp) {
        const interval = this.#options.upInterval;
        this.#nextUp = this.#time + between(this.#random, 0.7 * interval, 1.3 * interval);
        if (this.#layout.silos) {
          this.#appWriteBack(agent);
        } else {
          this.#appWrite(agent);
        }
      }
      return;
    }
    const sink = agent === undefined ? undefined : this.#layout.sinks[agent];
    const sinkGrid = agent === undefined ? undefined : this.#layout.sinkGrids[agent];
    if (agent === undefined || !sink || !sinkGrid || !this.#syncing || this.#time < this.#nextUp) {
      return;
    }
    const interval = this.#options.upInterval;
    this.#nextUp = this.#time + between(this.#random, 0.7 * interval, 1.3 * interval);
    const source = Math.floor(this.#random() * this.#layout.sources.length);
    const serial = this.#serial++;
    const body = this.#body({
      id: `m${serial}`,
      serial,
      molecule: generateMolecule(this.#random),
      hue: this.#layout.sources[source].hue,
      source,
      zone: 'source',
      phase: 'forming',
      position: snap(sinkGrid, this.#freeSpot(sink.well)),
      authored: true,
    });
    const start = add(body.position, centre(body.offsets));
    const well = this.#wellGate(`well-sink-${agent}`);
    if (this.#send(body, 'sink', body.position, (target) => square(start, target, 'x', well), agent)) {
      this.#bodies.push(body);
    }
  }

  /** A random spot in the well, clear of its edge. */
  #freeSpot(well: Rect): Point {
    const margin = 2 * this.#layout.hubGrid.spacing + 6;
    return {
      x: between(this.#random, well.x + margin, well.x + well.width - margin),
      y: between(this.#random, well.y + margin, well.y + well.height - margin),
    };
  }

  /** Sends a formed molecule down its source's channel to its place on the hub lattice. */
  #depart(body: Body): void {
    // The monolithic agent reads every source: about half of what forms also rises, as a copy, into it.
    if (this.#layout.monolith && this.#agentReads && !body.read && this.#random() < AGENT_READS) {
      body.read = true;
      this.#readUp(body);
    }
    // One molecule at a time leaves a source's well, so those setting off never crowd each other on the way out.
    const { well } = this.#layout.sources[body.source];
    const leaving = this.#bodies.some(
      (other) =>
        other !== body &&
        other.phase === 'travelling' &&
        other.cursor.x >= well.x &&
        other.cursor.x <= well.x + well.width &&
        other.cursor.y >= well.y &&
        other.cursor.y <= well.y + well.height,
    );
    if (leaving) {
      body.dwell += 0.25;
      return;
    }
    const sent = this.#layout.silos
      ? this.#departToApp(body)
      : this.#layout.hub.round
        ? this.#departRound(body)
        : this.#departStacked(body);
    if (sent) {
      this.#leaveHome(body);
    } else {
      // No room even after evicting: wait in the well and try again shortly.
      body.dwell += 0.5;
    }
  }

  /** Down the source's channel, sideways along the lane above the band to a random section, then down onto it. */
  #departStacked(body: Body): boolean {
    const channel = this.#layout.channels[body.source];
    const gate = channelGate(body.source, 1);
    const lane = this.#lane('top');
    const start = add(body.position, centre(body.offsets));
    // Each molecule aims at a random section of the band, so no channel feeds only the part beneath it.
    const { bounds, origin } = this.#layout.hubGrid;
    const aim = { x: between(this.#random, bounds.x, bounds.x + bounds.width), y: origin.y };
    const well = this.#wellGate(`well-source-${body.source}`);
    return this.#send(body, 'hub', aim, (target) => {
      // The drop from the lane onto the band is part of the lane's stretch, so it never crosses traffic rising to it.
      const span = laneGate('top', channel.to.x, target.x, 'down');
      return [
        ...square(start, channel.from, 'x', well),
        // The well stays held until the molecule is down the channel, so the next to leave starts well behind it.
        { point: channel.to, gate, gates: [well] },
        { point: { x: channel.to.x, y: lane }, gate },
        { point: { x: target.x, y: lane }, gate: span },
        { point: target, gate: span },
      ];
    });
  }

  /**
   * Out of the source box square to its channel, along the channel into the round hub, the short way around its inner
   * ring to the molecule's place, then straight in. Each molecule aims within a sector and a half of its channel, so
   * its arc stays short and ring traffic stays sparse.
   */
  #departRound(body: Body): boolean {
    const channel = this.#layout.channels[body.source];
    const gate = channelGate(body.source, 1);
    const { origin, radius = 0, spacing } = this.#layout.hubGrid;
    const ring = radius - spacing;
    const start = add(body.position, centre(body.offsets));
    const enter = Math.atan2(channel.to.y - origin.y, channel.to.x - origin.x);
    const sector = (2 * Math.PI) / this.#layout.sources.length;
    const reach = this.#random() * radius * 0.8;
    const toward = enter + between(this.#random, -1.5, 1.5) * sector;
    const aim = { x: origin.x + reach * Math.cos(toward), y: origin.y + reach * Math.sin(toward) };
    const well = this.#wellGate(`well-source-${body.source}`);
    return this.#send(body, 'hub', aim, (target) => {
      const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
      // The move in from the ring is part of the ring's stretch, so it never crosses traffic on the ring.
      const span = ringGate(enter, angle, ring);
      return [
        ...square(start, channel.from, 'x', well),
        { point: channel.to, gate, gates: [well] },
        { point: { x: origin.x + ring * Math.cos(enter), y: origin.y + ring * Math.sin(enter) }, gate },
        ...arc(origin, ring, enter, angle).map((point) => ({ point, gate: span })),
        { point: target, gate: span },
      ];
    });
  }

  /**
   * Claims a place for `body` on the zone's lattice near `aim` (evicting until one fits) and routes it there by the legs
   * `plan` lays to its target; false when the lattice has no room at all.
   */
  #send(body: Body, zone: 'hub' | 'sink', aim: Point, plan: (target: Point) => Leg[], agent = 0): boolean {
    const crystal = this.#crystal(zone, agent);
    if (!crystal) {
      return false;
    }
    if (zone === 'hub') {
      const held = this.#bodies.filter((other) => other.zone === 'hub' && other.phase !== 'leaving');
      if (held.length >= this.#options.hubCapacity) {
        this.#evictEdge('hub');
      }
    }
    let placement = crystal.place(body.molecule, aim, this.#random);
    while (!placement && this.#evictEdge(zone, 0, agent)) {
      placement = crystal.place(body.molecule, aim, this.#random);
    }
    if (!placement) {
      return false;
    }

    crystal.occupy(body.id, placement);
    body.zone = zone;
    body.agent = zone === 'sink' ? agent : undefined;
    body.phase = 'travelling';
    body.age = 0;
    body.sites = placement.sites;
    // The molecule takes the shape it was placed in when it lands; its atoms shift into it on the final drop.
    const [root] = placement.sites;
    body.next = { atoms: placement.sites.map((site) => hexSubtract(site, root)), bonds: body.molecule.bonds };
    body.from = body.offsets;
    body.to = body.next.atoms.map((atom) => hexToPoint(atom, crystal.grid.spacing));
    this.#route(body, plan(add(crystal.position(root), centre(body.to))));
    return true;
  }

  /** The whole of a well, held by one moving molecule at a time (each takes a direction no other shares). */
  #wellGate(track: string): Gate {
    this.#ticket++;
    return { track, from: 0, to: 1, direction: this.#ticket };
  }

  /** The empty row above (or below) the hub's band, where molecules move sideways to the section they are headed for. */
  #lane(side: 'top' | 'bottom'): number {
    const { lanes } = this.#layout.hub;
    if (lanes) {
      return lanes[side];
    }
    const { bounds, spacing } = this.#layout.hubGrid;
    const row = (spacing * Math.sqrt(3)) / 2;
    return side === 'top' ? bounds.y + row : bounds.y + bounds.height - row;
  }

  /** Starts `body` along `legs`, which its centre follows; it moves once it holds every gate they need. */
  #route(body: Body, legs: Leg[]): void {
    body.cursor = add(body.position, centre(body.offsets));
    const kept = legs.filter((leg, index) => {
      const previous = index === 0 ? body.cursor : legs[index - 1].point;
      return index === legs.length - 1 || Math.hypot(leg.point.x - previous.x, leg.point.y - previous.y) > 0.01;
    });
    body.route = kept.map(({ point }) => point);
    body.gates = kept.map(({ gate, gates = [] }) => [...(gate ? [gate] : []), ...gates]);
    body.cleared = false;
    body.distance = pathLength(body.cursor, body.route);
    body.travelled = 0;
    const last = body.route.length > 1 ? body.route[body.route.length - 2] : body.cursor;
    const target = body.route[body.route.length - 1];
    body.settle = body.distance - Math.hypot(target.x - last.x, target.y - last.y);
  }

  /**
   * Takes every gate `body`'s route needs, all at once or none: a gate is free unless another molecule holds an
   * overlapping stretch of the same track going the other way. Taking them together means no molecule ever waits while
   * holding a gate another needs, so traffic never deadlocks.
   */
  #acquire(body: Body): boolean {
    const gates = [...new Set(body.gates.flat())];
    const blocked = gates.some((gate) =>
      (this.#tracks.get(gate.track) ?? []).some(
        (held) => held.body !== body.id && held.gate.direction !== gate.direction && overlaps(held.gate, gate),
      ),
    );
    if (blocked) {
      return false;
    }
    for (const gate of gates) {
      this.#tracks.set(gate.track, [...(this.#tracks.get(gate.track) ?? []), { body: body.id, gate }]);
    }
    return true;
  }

  #releaseGate(body: Body, gate: Gate): void {
    const held = this.#tracks.get(gate.track) ?? [];
    this.#tracks.set(
      gate.track,
      held.filter((entry) => entry.body !== body.id || entry.gate !== gate),
    );
  }

  #releaseAll(body: Body): void {
    if (body.cleared) {
      for (const gate of new Set(body.gates.flat())) {
        this.#releaseGate(body, gate);
      }
    }
    body.gates = [];
    body.cleared = false;
  }

  #dock(body: Body): void {
    this.#releaseAll(body);
    body.phase = 'docked';
    body.age = 0;
    // The next dim slot of the shared clock, so the blinks are whole and in step with every other molecule's.
    const slot = Math.floor(this.#time * FLICKER_RATE);
    body.blink = slot % 2 === 1 ? slot + 2 : slot + 1;
    body.offsets = body.to;
    if (body.next) {
      body.molecule = body.next;
      body.next = undefined;
    }
    if (body.zone === 'source') {
      // A write-back has reached its source, which absorbs it.
      body.phase = 'leaving';
      return;
    }
    if (body.zone === 'app') {
      // An application takes the molecule in as a piece of its content.
      const app = this.#apps[body.agent ?? 0];
      if (app && body.slot !== undefined) {
        app.items[body.slot] = { hue: body.hue, source: body.source, since: this.#time };
        app.reserved.delete(body.slot);
      }
      body.phase = 'leaving';
      return;
    }
    if (body.zone === 'hub') {
      this.#landed++;
    }
    // A molecule settles into its lattice for a while before passing on, so nothing reads as going from a source to the
    // sink (or back) without stopping in the hub.
    const passes = body.authored
      ? body.zone === 'sink' || this.#random() < this.#options.writeback
      : // In the silos the apps are fed straight from their sources, so the hub (a monolithic agent) syncs to none of them.
        body.zone === 'hub' && !this.#layout.silos && this.#syncing && this.#subset(body);
    if (passes) {
      body.handoff = this.#time + between(this.#random, HANDOFF_DELAY.min, HANDOFF_DELAY.max);
    }
  }

  /** Passes a settled molecule on: an agent's up the stack, one step at a time, or a hub molecule's copy down. */
  #handOff(body: Body): void {
    if (body.authored) {
      if (body.zone === 'sink') {
        this.#syncUp(body);
      } else {
        this.#writeBack(body);
      }
    } else if (body.zone === 'hub') {
      const agent = body.syncTo ?? this.#anyAgent();
      body.syncTo = undefined;
      if (agent !== undefined && !body.synced) {
        if (this.#layout.sinks[agent]?.app) {
          this.#syncToApp(body, agent);
        } else {
          this.#syncDown(body, agent);
        }
      }
    }
  }

  /** A copy of a docked hub molecule leaves along the lane below the band and runs down an agent's channel to its sink. */
  #syncDown(body: Body, agent: number): void {
    const { sources, sinks, channels } = this.#layout;
    const sink = sinks[agent];
    if (!sink) {
      return;
    }
    const index = sources.length + agent;
    const channel = channels[index];
    const gate = channelGate(index, 1);
    const lane = this.#lane('bottom');
    const copy = this.#copy(body, 'copy');
    copy.origin = body.id;
    const start = copy.cursor;
    const entry = { x: channel.to.x, y: sink.well.y + this.#layout.hubGrid.spacing };
    const span = laneGate('bottom', start.x, channel.from.x, 'down');
    const well = this.#wellGate(`well-sink-${agent}`);
    const sent = this.#send(
      copy,
      'sink',
      entry,
      (target) => [
        { point: { x: start.x, y: lane }, gate: span },
        { point: { x: channel.from.x, y: lane }, gate: span },
        { point: channel.from, gate },
        { point: channel.to, gate, gates: [well] },
        { point: entry, gate, gates: [well] },
        ...square(entry, target, 'x', well),
      ],
      agent,
    );
    if (sent) {
      body.synced = true;
      this.#bodies.push(copy);
    }
  }

  /** A copy of what the agent wrote rises up the hub's channel and attaches to the hub lattice from below. */
  #syncUp(body: Body): void {
    const agent = body.agent ?? 0;
    const { sources, sinks, channels } = this.#layout;
    const sink = sinks[agent];
    if (!sink) {
      return;
    }
    const index = sources.length + agent;
    const channel = channels[index];
    const gate = channelGate(index, -1);
    const lane = this.#lane('bottom');
    const copy = this.#copy(body, 'up');
    const start = copy.cursor;
    const top = sink.well.y + this.#layout.hubGrid.spacing;
    const aim = { x: channel.from.x, y: lane };
    const well = this.#wellGate(`well-sink-${agent}`);
    const sent = this.#send(copy, 'hub', aim, (target) => {
      const span = laneGate('bottom', channel.from.x, target.x, 'up');
      return [
        { point: { x: start.x, y: top }, gate: well },
        { point: { x: channel.to.x, y: top }, gate: well },
        { point: channel.to, gate, gates: [well] },
        { point: channel.from, gate, gates: [well] },
        { point: { x: channel.from.x, y: lane }, gate },
        { point: { x: target.x, y: lane }, gate: span },
        { point: target, gate: span },
      ];
    });
    if (sent) {
      this.#bodies.push(copy);
    }
  }

  /** Fills about two thirds of every application's slots: most settled long ago, one in seven fresh in its colour. */
  #prefill(): void {
    const { sources } = this.#layout;
    for (const app of this.#apps) {
      app.slots.forEach((_, slot) => {
        if (this.#random() < 0.65) {
          const source = Math.floor(this.#random() * sources.length);
          const fresh = this.#random() < 1 / 7;
          app.items[slot] = { hue: sources[source].hue, source, since: fresh ? 0 : -60 };
        }
      });
    }
  }

  /** The middle of an application's frame: molecules flowing in or out pass behind the app to and from here. */
  #appCore(agent: number): Point {
    const { frame } = this.#layout.sinks[agent];
    return { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
  }

  /**
   * A slot of the application to fill: an empty one at random, or else the oldest piece of content, which makes way.
   * Answers undefined when every slot is already awaiting a molecule.
   */
  #pickSlot(agent: number): number | undefined {
    const app = this.#apps[agent];
    const open = app.slots.map((_, index) => index).filter((index) => !app.reserved.has(index));
    const empty = open.filter((index) => app.items[index] === undefined);
    const slot =
      empty.length > 0
        ? empty[Math.floor(this.#random() * empty.length)]
        : open.reduce<number | undefined>(
            (oldest, index) =>
              oldest === undefined || (app.items[index]?.since ?? 0) < (app.items[oldest]?.since ?? 0) ? index : oldest,
            undefined,
          );
    if (slot !== undefined) {
      app.reserved.add(slot);
    }
    return slot;
  }

  /**
   * A copy of a docked hub molecule leaves along the lane below the band and runs down an application's channel into
   * the app, where it becomes a piece of content.
   */
  #syncToApp(body: Body, agent: number): void {
    const { sources, sinks, channels } = this.#layout;
    const sink = sinks[agent];
    const slot = this.#pickSlot(agent);
    if (!sink || slot === undefined) {
      return;
    }
    const index = sources.length + agent;
    const channel = channels[index];
    const gate = channelGate(index, 1);
    const lane = this.#lane('bottom');
    const copy = this.#copy(body, 'copy');
    copy.zone = 'app';
    copy.agent = agent;
    copy.slot = slot;
    const start = copy.cursor;
    const span = laneGate('bottom', start.x, channel.from.x, 'down');
    // The molecule runs on behind the app and is taken in there; the app shows what it brought by lighting up a slot.
    this.#route(copy, [
      { point: { x: start.x, y: lane }, gate: span },
      { point: { x: channel.from.x, y: lane }, gate: span },
      { point: channel.from, gate },
      { point: channel.to, gate },
      { point: this.#appCore(agent), gate },
    ]);
    body.synced = true;
    this.#bodies.push(copy);
  }

  /**
   * A copy of a source's molecule for the monolithic agent: it appears in the feed box above the agent's channel and
   * drops down the channel onto the agent's lattice. Skipped while the
   * last copy is still there, so copies never pile up on the spot.
   */
  #readUp(body: Body): void {
    const feed = this.#layout.monolith;
    if (!feed) {
      return;
    }
    const down = this.#layout.channels[feed.down];
    const { well } = feed.feed;
    const spot = { x: down.from.x, y: well.y + well.height / 2 };
    const crowded = this.#bodies.some(
      (other) =>
        other.phase === 'travelling' && Math.hypot(other.cursor.x - spot.x, other.cursor.y - spot.y) < QUEUE_GAP,
    );
    if (crowded) {
      return;
    }
    const downGate = channelGate(feed.down, 1);
    const into = this.#wellGate('well-agent');
    const copy = this.#copy(body, 'read');
    const middle = centre(copy.offsets);
    copy.position = { x: spot.x - middle.x, y: spot.y - middle.y };
    copy.opacity = 0;
    const entry = { x: down.to.x, y: this.#layout.hub.well.y + this.#layout.hubGrid.spacing };
    const sent = this.#send(copy, 'hub', entry, (target) => [
      { point: down.from, gate: downGate },
      { point: down.to, gate: downGate },
      { point: entry, gate: downGate, gates: [into] },
      ...square(entry, target, 'x', into),
    ]);
    if (sent) {
      this.#bodies.push(copy);
    }
  }

  /** In a silo, straight from the source's well down its own channel into its own application. */
  #departToApp(body: Body): boolean {
    const agent = body.source;
    const sink = this.#layout.sinks[agent];
    const slot = sink ? this.#pickSlot(agent) : undefined;
    if (!sink || slot === undefined) {
      return false;
    }
    const channel = this.#layout.channels[agent];
    const gate = channelGate(agent, 1);
    const well = this.#wellGate(`well-source-${agent}`);
    const start = add(body.position, centre(body.offsets));
    body.zone = 'app';
    body.phase = 'travelling';
    body.age = 0;
    body.agent = agent;
    body.slot = slot;
    this.#route(body, [
      ...square(start, channel.from, 'x', well),
      // The molecule runs on behind the app and is taken in there; the app shows what it brought by lighting up a slot.
      { point: channel.to, gate, gates: [well] },
      { point: this.#appCore(agent), gate },
    ]);
    return true;
  }

  /** In a silo, a piece of an application's content flares and a molecule of it rises back to the app's own source. */
  #appWriteBack(agent: number): void {
    const sink = this.#layout.sinks[agent];
    const app = this.#apps[agent];
    const filled = app.items.flatMap((item, slot) => (item && !app.reserved.has(slot) ? [slot] : []));
    if (!sink || filled.length === 0) {
      return;
    }
    const slot = filled[Math.floor(this.#random() * filled.length)];
    const item = app.items[slot];
    const molecule = generateMolecule(this.#random);
    const home = item && this.#findHome(agent, molecule);
    if (!item || !home) {
      return;
    }
    item.since = this.#time;
    const channel = this.#layout.channels[agent];
    const gate = channelGate(agent, -1);
    const offsets = this.#offsets(molecule);
    const middle = centre(offsets);
    // The molecule comes out from behind the app, up its channel, while the slot it came from lights up.
    const from = this.#appCore(agent);
    const serial = this.#serial++;
    const body = this.#body({
      id: `m${serial}-back`,
      serial,
      molecule,
      hue: item.hue,
      source: agent,
      zone: 'source',
      phase: 'travelling',
      position: { x: from.x - middle.x, y: from.y - middle.y },
      offsets,
      opacity: 0.4,
      authored: true,
    });
    this.#takeHome(agent, body.id, home);
    body.home = { source: agent, sites: home.sites };
    const well = this.#wellGate(`well-source-${agent}`);
    this.#route(body, [
      { point: channel.to, gate },
      { point: channel.from, gate, gates: [well] },
      ...square(channel.from, add(home.root, middle), 'y', well),
    ]);
    this.#bodies.push(body);
  }

  /**
   * Now and then an application writes: a piece of its content pulses and a molecule of its colour rises from it, up the
   * app's channel to the hub's lattice.
   */
  #appWrite(agent: number): void {
    const { sources, sinks, channels } = this.#layout;
    const sink = sinks[agent];
    const app = this.#apps[agent];
    const filled = app.items.flatMap((item, slot) => (item && !app.reserved.has(slot) ? [slot] : []));
    if (!sink || filled.length === 0) {
      return;
    }
    const slot = filled[Math.floor(this.#random() * filled.length)];
    const item = app.items[slot];
    if (!item) {
      return;
    }
    item.since = this.#time;
    const index = sources.length + agent;
    const channel = channels[index];
    const gate = channelGate(index, -1);
    const lane = this.#lane('bottom');
    const molecule = generateMolecule(this.#random);
    const offsets = this.#offsets(molecule);
    // The molecule comes out from behind the app, up its channel, while the slot it came from lights up.
    const centreOf = this.#appCore(agent);
    const middle = centre(offsets);
    const serial = this.#serial++;
    const body = this.#body({
      id: `m${serial}`,
      serial,
      molecule,
      hue: item.hue,
      source: item.source,
      zone: 'source',
      phase: 'forming',
      position: { x: centreOf.x - middle.x, y: centreOf.y - middle.y },
      offsets,
      authored: true,
    });
    const aim = { x: channel.from.x, y: lane };
    const sent = this.#send(body, 'hub', aim, (target) => {
      const span = laneGate('bottom', channel.from.x, target.x, 'up');
      return [
        { point: channel.to, gate },
        { point: channel.from, gate },
        { point: { x: channel.from.x, y: lane }, gate },
        { point: { x: target.x, y: lane }, gate: span },
        { point: target, gate: span },
      ];
    });
    if (sent) {
      this.#bodies.push(body);
    }
  }

  /** A copy of an agent-written hub molecule rises up its source's channel to a free place in the source's well. */
  #writeBack(body: Body): void {
    const home = this.#findHome(body.source, body.molecule);
    if (!home) {
      return;
    }
    const channel = this.#layout.channels[body.source];
    const gate = channelGate(body.source, -1);
    const lane = this.#lane('top');
    const copy = this.#copy(body, 'back');
    const start = copy.cursor;
    this.#takeHome(body.source, copy.id, home);
    copy.home = { source: body.source, sites: home.sites };
    // Back in its source the molecule takes its own shape again, at its place on the source's grid.
    copy.to = this.#offsets(copy.molecule);
    const destination = add(home.root, centre(copy.to));
    const span = laneGate('top', start.x, channel.to.x, 'up');
    const well = this.#wellGate(`well-source-${body.source}`);
    this.#route(copy, [
      { point: { x: start.x, y: lane }, gate: span },
      { point: { x: channel.to.x, y: lane }, gate: span },
      { point: channel.to, gate, gates: [well] },
      { point: channel.from, gate, gates: [well] },
      ...square(channel.from, destination, 'y', well),
    ]);
    this.#bodies.push(copy);
  }

  /** A travelling copy of a docked body, starting where it is, with no lattice sites of its own yet. */
  #copy(body: Body, suffix: string): Body {
    return {
      ...body,
      id: `${body.id}-${suffix}`,
      zone: 'source',
      phase: 'travelling',
      position: { ...body.position },
      cursor: add(body.position, centre(body.offsets)),
      opacity: 0.4,
      age: 0,
      route: [],
      gates: [],
      cleared: false,
      distance: 0,
      travelled: 0,
      settle: 0,
      from: body.offsets,
      to: body.offsets,
      sites: undefined,
      next: undefined,
      home: undefined,
      origin: undefined,
      synced: undefined,
      tint: undefined,
      agent: undefined,
      syncTo: undefined,
      slot: undefined,
    };
  }

  /**
   * Evicts the zone's docked molecule nearest the lattice's edge (the oldest among equals) that has been held at least
   * `minAge` seconds; false when there is none.
   */
  #evictEdge(zone: 'hub' | 'sink', minAge = 0, agent = 0): boolean {
    const crystal = this.#crystal(zone, agent);
    if (!crystal) {
      return false;
    }
    let victim: { body: Body; exposure: number } | undefined;
    for (const body of this.#bodies) {
      const here = body.zone === zone && (zone !== 'sink' || body.agent === agent);
      if (!here || body.phase !== 'docked' || body.age < minAge || this.#anchors(crystal, body)) {
        continue;
      }
      const exposure = crystal.exposure(body.sites ?? []);
      if (!victim || exposure > victim.exposure || (exposure === victim.exposure && body.age > victim.body.age)) {
        victim = { body, exposure };
      }
    }
    if (!victim) {
      return false;
    }
    this.#evict(victim.body);
    return true;
  }

  /**
   * Whether `body` must wait behind another moving molecule just ahead of it, so molecules going the same way follow at a
   * distance. Gates keep opposing traffic apart; should two molecules still wait on each other, the older goes on.
   */
  #queued(body: Body): boolean {
    const direction = heading(body);
    if (!direction) {
      return false;
    }
    return this.#bodies.some((other) => {
      if (other === body || other.phase !== 'travelling' || !other.cleared) {
        return false;
      }
      const dx = other.cursor.x - body.cursor.x;
      const dy = other.cursor.y - body.cursor.y;
      const distance = Math.hypot(dx, dy);
      // Ahead means within the gap and inside a cone about the direction of travel.
      if (distance >= QUEUE_GAP || dx * direction.x + dy * direction.y < distance * 0.5) {
        return false;
      }
      const theirs = heading(other);
      const mutual = theirs !== undefined && -dx * theirs.x - dy * theirs.y >= distance * 0.5;
      return !(mutual && body.serial < other.serial);
    });
  }

  /** Whether a molecule still on its way is bonded to `body`: it must stay until that one lands, or it would fade mid-flight. */
  #anchors(crystal: Crystal, body: Body): boolean {
    const partners = new Set(crystal.partners(body.id));
    return this.#bodies.some((other) => other.phase === 'travelling' && partners.has(other.id));
  }

  #evict(body: Body): void {
    const orphans = this.#crystal(body.zone, body.agent)?.release(body.id, body.sites ?? []) ?? [];
    this.#releaseAll(body);
    body.phase = 'leaving';
    body.age = 0;
    body.route = [];
    // A docked molecule left with no bond is no longer part of the lattice, so it decays too.
    for (const id of orphans) {
      const orphan = this.#bodies.find((other) => other.id === id && other.phase === 'docked');
      if (orphan) {
        this.#evict(orphan);
      }
    }
    if (body.zone === 'hub') {
      // A sync is a mirror: the copy goes when its original does, unless it is still on its way, when it lands as a
      // molecule of the sink's own.
      const copy = this.#bodies.find((other) => other.origin === body.id && other.phase !== 'leaving');
      if (copy?.phase === 'docked') {
        this.#evict(copy);
      } else if (copy) {
        copy.origin = undefined;
      }
    } else if (body.origin) {
      const origin = this.#bodies.find((other) => other.id === body.origin);
      if (origin) {
        origin.synced = false;
      }
    }
  }

  /** Moves `distance` along the route, shifting the atoms into place on the final drop; true once the route ends. */
  #advance(body: Body, distance: number): boolean {
    let remaining = distance;
    while (body.route.length > 0) {
      const [next] = body.route;
      const dx = next.x - body.cursor.x;
      const dy = next.y - body.cursor.y;
      const length = Math.hypot(dx, dy);
      if (length > remaining) {
        body.cursor = { x: body.cursor.x + (dx / length) * remaining, y: body.cursor.y + (dy / length) * remaining };
        body.travelled += remaining;
        break;
      }
      body.cursor = { ...next };
      body.travelled += length;
      remaining -= length;
      body.route.shift();
      // A gate is let go once the last leg that needs it is done.
      for (const gate of body.gates.shift() ?? []) {
        if (!body.gates.some((gates) => gates.includes(gate))) {
          this.#releaseGate(body, gate);
        }
      }
    }
    const drop = body.distance - body.settle;
    const progress = drop > 0 ? Math.min(1, Math.max(0, (body.travelled - body.settle) / drop)) : 1;
    // Smoothstep, so the shift into place starts and settles gently.
    const eased = progress * progress * (3 - 2 * progress);
    body.offsets = body.from.map((from, index) => ({
      x: from.x + (body.to[index].x - from.x) * eased,
      y: from.y + (body.to[index].y - from.y) * eased,
    }));
    const offset = centre(body.offsets);
    body.position = { x: body.cursor.x - offset.x, y: body.cursor.y - offset.y };
    return body.route.length === 0;
  }
}
