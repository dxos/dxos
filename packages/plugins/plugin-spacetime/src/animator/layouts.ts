//
// Copyright 2026 DXOS.org
//

//
// Arrangers a spacetime shot's script may name (plugin-animator F-3.3), ported from the echo3d prototype's layout: a
// ring, an orbit round a centre object, a grid, and containment (members packed inside a container sphere). Each
// places targets in the ground (xz) plane unless tilted, and reads positions and scales from the values before the beat.
//

import { type ArrangeInput, type Arranger, type Vec3 } from '@dxos/animation';

import { radiusOf, vec3Or } from './stage.ts';

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };
const UNIT: Vec3 = { x: 1, y: 1, z: 1 };

const numberParam = (params: ArrangeInput['params'], name: string, fallback: number): number => {
  const value = params[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const positionOf = (input: ArrangeInput, target: string): Vec3 => vec3Or(input.values(target).position, ORIGIN);

const radiusOfTarget = (input: ArrangeInput, target: string): number =>
  radiusOf(vec3Or(input.values(target).scale, UNIT));

const centroid = (input: ArrangeInput): Vec3 => {
  const points = input.targets.map((target) => positionOf(input, target));
  if (points.length === 0) {
    return ORIGIN;
  }
  const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y, z: total.z + point.z }));
  return { x: sum.x / points.length, y: sum.y / points.length, z: sum.z / points.length };
};

/** The centre a layout turns about: `params.centre` as a target id or a point, else the targets' centroid. */
const centreOf = (input: ArrangeInput): Vec3 => {
  const centre = input.params.centre;
  if (typeof centre === 'string') {
    return positionOf(input, centre);
  }
  return vec3Or(centre, centroid(input));
};

/**
 * Points evenly round a circle of `radius` about `centre` from angle `start` (radians, 0 = +x), across `span` (a full
 * circle when unset; an arc has a place at each end), tilted about the x axis by `tilt`.
 */
const circle = (
  targets: readonly string[],
  centre: Vec3,
  { radius, start, span, tilt }: { radius: number; start: number; span?: number; tilt: number },
): Record<string, Vec3> => {
  const places = span === undefined ? targets.length : Math.max(1, targets.length - 1);
  const sweep = span ?? Math.PI * 2;
  return Object.fromEntries(
    targets.map((target, index) => {
      const angle = start + (index / places) * sweep;
      const x = Math.cos(angle) * radius;
      const depth = Math.sin(angle) * radius;
      return [target, { x: centre.x + x, y: centre.y + depth * Math.sin(tilt), z: centre.z + depth * Math.cos(tilt) }];
    }),
  );
};

const optionalNumber = (params: ArrangeInput['params'], name: string): number | undefined => {
  const value = params[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

/** Targets evenly on a circle (`radius`, default 3) about `centre`; see `circle` for `start`, `span` and `tilt`. */
export const ring: Arranger = (input) =>
  circle(input.targets, centreOf(input), {
    radius: numberParam(input.params, 'radius', 3),
    start: numberParam(input.params, 'start', 0),
    span: optionalNumber(input.params, 'span'),
    tilt: numberParam(input.params, 'tilt', 0),
  });

/**
 * Targets on a circle round the `centre` target, `gap` (default 1) beyond its edge unless `radius` is given; the
 * centre itself does not move.
 */
export const orbit: Arranger = (input) => {
  const centre = input.params.centre;
  const id = typeof centre === 'string' ? centre : undefined;
  const members = input.targets.filter((target) => target !== id);
  const edge = id ? radiusOfTarget(input, id) : 0;
  return circle(members, centreOf(input), {
    radius: numberParam(input.params, 'radius', edge + numberParam(input.params, 'gap', 1)),
    start: numberParam(input.params, 'start', 0),
    span: optionalNumber(input.params, 'span'),
    tilt: numberParam(input.params, 'tilt', 0),
  });
};

/** Targets in rows of `columns` (default the square root, rounded up), `spacing` (default 2) apart, about `centre`. */
export const grid: Arranger = (input) => {
  const count = input.targets.length;
  const columns = Math.max(1, Math.round(numberParam(input.params, 'columns', Math.ceil(Math.sqrt(count)))));
  const rows = Math.ceil(count / columns);
  const spacing = numberParam(input.params, 'spacing', 2);
  const centre = centreOf(input);
  return Object.fromEntries(
    input.targets.map((target, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return [
        target,
        {
          x: centre.x + (column - (columns - 1) / 2) * spacing,
          y: centre.y,
          z: centre.z + (row - (rows - 1) / 2) * spacing,
        },
      ];
    }),
  );
};

/**
 * Where `count` members pack inside a container of `radius`: evenly round its centre (one member sits at it), turned
 * so none sits at the top of the frame, where the container's label goes (echo3d's `pack`).
 */
export const packGeometry = (count: number, radius: number): { distance: number; size: number } => {
  const distance = count === 1 ? 0 : radius * 0.52;
  const size = count === 1 ? radius * 0.6 : Math.min(radius * 0.42, distance * Math.sin(Math.PI / count) * 0.92);
  return { distance, size };
};

/** Members packed inside the `container` target's sphere; `fill` (default 1) scales how far out they sit. */
export const containment: Arranger = (input) => {
  const container = input.params.container;
  if (typeof container !== 'string') {
    return {};
  }
  const members = input.targets.filter((target) => target !== container);
  const centre = positionOf(input, container);
  const { distance } = packGeometry(members.length, radiusOfTarget(input, container));
  const reach = distance * numberParam(input.params, 'fill', 1);
  return Object.fromEntries(
    members.map((target, index) => {
      const angle = (index / members.length) * Math.PI * 2 - Math.PI / 2 + Math.PI / members.length;
      return [target, { x: centre.x + Math.cos(angle) * reach, y: centre.y, z: centre.z + Math.sin(angle) * reach }];
    }),
  );
};

/** The layouts a spacetime shot's script may name. */
export const SPACETIME_LAYOUTS: Readonly<Record<string, Arranger>> = { ring, orbit, grid, containment };
