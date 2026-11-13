//
// Copyright 2026 DXOS.org
//

// Rewrites the other half of a background pair from the half you edited: `bg-echo-left.svg` gives `bg-echo-right.svg`.
// The icon moves without mirroring, so asymmetric marks such as KUBE keep their orientation, and the lines move with it.
// A line that reached the edge of the frame is extended back to the frame after the move, so no edge is left bare.
// Usage: node scripts/flip-backgrounds.mjs <bg-name-left.svg | bg-name-right.svg>...

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '../assets/backgrounds');

const WIDTH = 1920;

/** Lines in the sources run 20 units past the 1920×1080 frame, so their caps never show. */
const BOUNDS = { left: -20, right: 1940, top: -20, bottom: 1100 };

const EPSILON = 0.5;

/** Icons this far from the centre are on a side; a centred icon has no other side to move to. */
const MIN_OFFSET = 100;

const isOnEdge = ([x, y]) =>
  Math.abs(x - BOUNDS.left) < EPSILON ||
  Math.abs(x - BOUNDS.right) < EPSILON ||
  Math.abs(y - BOUNDS.top) < EPSILON ||
  Math.abs(y - BOUNDS.bottom) < EPSILON;

/** Parses `M x,y L x,y … [Z]` path data into subpaths. */
const parsePath = (data) =>
  data
    .split(/(?=M)/)
    .map((part) => ({
      points: [...part.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((match) => [+match[1], +match[2]]),
      closed: /Z/.test(part),
    }))
    .filter((subpath) => subpath.points.length > 0);

const formatPath = (subpaths) =>
  subpaths
    .map(
      ({ points, closed }) =>
        points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') +
        (closed ? ' Z' : ''),
    )
    .join(' ');

/** Clips the infinite line through `from` and `to` to the bounds (Liang–Barsky); returns undefined if it misses. */
const clipLine = (from, to) => {
  const delta = [to[0] - from[0], to[1] - from[1]];
  let entry = -Infinity;
  let exit = Infinity;
  for (const [axis, min, max] of [
    [0, BOUNDS.left, BOUNDS.right],
    [1, BOUNDS.top, BOUNDS.bottom],
  ]) {
    if (Math.abs(delta[axis]) < 1e-9) {
      if (from[axis] < min || from[axis] > max) {
        return undefined;
      }
      continue;
    }
    const near = (min - from[axis]) / delta[axis];
    const far = (max - from[axis]) / delta[axis];
    entry = Math.max(entry, Math.min(near, far));
    exit = Math.min(exit, Math.max(near, far));
  }
  if (entry > exit) {
    return undefined;
  }
  const at = (param) => [from[0] + param * delta[0], from[1] + param * delta[1]];
  return [at(entry), at(exit)];
};

/** Moves a line subpath and re-extends each end that sat on the frame edge, along its own segment. */
const moveLine = ({ points, closed }, offset) => {
  const moved = points.map(([x, y]) => [x + offset, y]);
  if (closed || points.length < 2) {
    return { points: moved, closed };
  }

  const last = points.length - 1;
  const startOnEdge = isOnEdge(points[0]);
  const endOnEdge = isOnEdge(points[last]);
  if (points.length === 2 && startOnEdge && endOnEdge) {
    const clipped = clipLine(moved[0], moved[1]);
    return clipped ? { points: clipped, closed } : undefined;
  }

  if (startOnEdge) {
    const clipped = clipLine(moved[1], moved[0]);
    if (clipped) {
      moved[0] = clipped[1];
    }
  }
  if (endOnEdge) {
    const clipped = clipLine(moved[last - 1], moved[last]);
    if (clipped) {
      moved[last] = clipped[1];
    }
  }
  return { points: moved, closed };
};

/** Returns the group element `<g id="…">…</g>` and the path data of each path in it. */
const readGroup = (svg, id) => {
  const match = svg.match(new RegExp(`<g id="${id}"[\\s\\S]*?</g>`));
  if (!match) {
    throw new Error(`No <g id="${id}"> group.`);
  }
  return match[0];
};

const replacePaths = (group, transform) =>
  group.replace(/ *<path d="([^"]*)"\/>\n?/g, (line, data) => {
    const subpaths = parsePath(data)
      .map(transform)
      .filter((subpath) => subpath !== undefined);
    return subpaths.length > 0 ? line.replace(data, formatPath(subpaths)) : '';
  });

const iconCentre = (group) => {
  const xs = [...group.matchAll(/ d="([^"]*)"/g)].flatMap((match) =>
    parsePath(match[1]).flatMap(({ points }) => points.map(([x]) => x)),
  );
  return (Math.min(...xs) + Math.max(...xs)) / 2;
};

const SIDES = { left: 'right', right: 'left' };

const files = process.argv.slice(2).map((arg) => basename(arg));
if (files.length === 0) {
  console.error('Usage: node scripts/flip-backgrounds.mjs <bg-name-left.svg | bg-name-right.svg>...');
  process.exit(1);
}

for (const file of files) {
  const [, name, side] = file.match(/^(bg-[a-z]+)-(left|right)\.svg$/) ?? [];
  if (!name) {
    throw new Error(`${file}: expected a pair file named bg-<name>-left.svg or bg-<name>-right.svg.`);
  }

  const svg = readFileSync(join(DIR, file), 'utf8');
  const icon = readGroup(svg, 'icon');
  const lines = readGroup(svg, 'lines');
  const centre = iconCentre(icon);
  if (Math.abs(centre - WIDTH / 2) < MIN_OFFSET) {
    throw new Error(`${file}: icon is centred (x=${centre.toFixed(1)}), so it has no other side.`);
  }
  // The name, not the art, says which half the user edited, so a misnamed file must not overwrite its partner.
  if ((centre < WIDTH / 2 ? 'left' : 'right') !== side) {
    throw new Error(`${file}: icon is on the other side (x=${centre.toFixed(1)}) from what the name says.`);
  }

  const offset = WIDTH - 2 * centre;
  const output = svg
    .replace(
      lines,
      replacePaths(lines, (subpath) => moveLine(subpath, offset)),
    )
    .replace(
      icon,
      replacePaths(icon, ({ points, closed }) => ({ points: points.map(([x, y]) => [x + offset, y]), closed })),
    );
  const target = `${name}-${SIDES[side]}.svg`;
  writeFileSync(join(DIR, target), output);
  console.log(`${file} -> ${target}: icon moved ${offset > 0 ? '+' : ''}${offset.toFixed(1)}.`);
}
