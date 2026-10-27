//
// Copyright 2026 DXOS.org
//

/** A point in scene units. */
export type Point = { x: number; y: number };

/** Axial coordinates of a site on a hexagonal lattice (pointy-top: rows are offset by half a step). */
export type Hex = { q: number; r: number };

/** Seeded random source in [0, 1), so a simulation replays the same way in tests. */
export type Random = () => number;

/** Mulberry32: tiny, fast and good enough for layout jitter. */
export const createRandom = (seed = 1): Random => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/** A random number in `[min, max)`. */
export const between = (random: Random, min: number, max: number): number => min + random() * (max - min);

/** The six lattice neighbours of a site, in turn. */
export const HEX_DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const hexKey = ({ q, r }: Hex): string => `${q},${r}`;
export const hexAdd = (a: Hex, b: Hex): Hex => ({ q: a.q + b.q, r: a.r + b.r });
export const hexSubtract = (a: Hex, b: Hex): Hex => ({ q: a.q - b.q, r: a.r - b.r });
export const hexDistance = ({ q, r }: Hex): number => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
export const hexNeighbours = (hex: Hex): Hex[] => HEX_DIRECTIONS.map((direction) => hexAdd(hex, direction));

/** A site's offset from the lattice origin, with `spacing` between neighbours. */
export const hexToPoint = ({ q, r }: Hex, spacing: number): Point => ({
  x: spacing * (q + r / 2),
  y: spacing * (Math.sqrt(3) / 2) * r,
});

/** The site nearest an offset from the lattice origin. */
export const pointToHex = ({ x, y }: Point, spacing: number): Hex => {
  const r = y / (spacing * (Math.sqrt(3) / 2));
  const q = x / spacing - r / 2;
  // Cube rounding: round all three axes and fix the one that moved most.
  const s = -q - r;
  let [rq, rr, rs] = [Math.round(q), Math.round(r), Math.round(s)];
  const [dq, dr, ds] = [Math.abs(rq - q), Math.abs(rr - r), Math.abs(rs - s)];
  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
};

/**
 * A small connected graph of atoms (a "data molecule") on the hexagonal lattice: every atom sits on a site and every
 * bond joins neighbouring sites, so a molecule docks onto a lattice of them by translation alone.
 */
export type Molecule = {
  /** Sites relative to the root (atom 0, at the origin). */
  atoms: readonly Hex[];
  /** Pairs of atom indices; together they form a tree. */
  bonds: readonly (readonly [number, number])[];
};

/** Most atoms a molecule may have. */
export const MAX_ATOMS = 4;

/** Sizes a molecule is drawn from: short snippets, mostly two or three atoms. */
const SIZES = [1, 2, 2, 3, 3, 4];

/** Furthest an atom may sit from the root, in lattice steps, so every molecule stays compact. */
const MAX_REACH = 2;

/** Grows a random tree of `size` atoms from the root, each new atom bonded to a lattice neighbour already placed. */
export const generateMolecule = (random: Random, size = SIZES[Math.floor(random() * SIZES.length)]): Molecule => {
  const atoms: Hex[] = [{ q: 0, r: 0 }];
  const bonds: [number, number][] = [];
  const taken = new Set([hexKey(atoms[0])]);
  let attempts = 0;
  while (atoms.length < Math.min(size, MAX_ATOMS) && attempts++ < 64) {
    const parent = Math.floor(random() * atoms.length);
    const site = hexAdd(atoms[parent], HEX_DIRECTIONS[Math.floor(random() * HEX_DIRECTIONS.length)]);
    if (hexDistance(site) > MAX_REACH || taken.has(hexKey(site))) {
      continue;
    }
    taken.add(hexKey(site));
    bonds.push([parent, atoms.length]);
    atoms.push(site);
  }
  return { atoms, bonds };
};
