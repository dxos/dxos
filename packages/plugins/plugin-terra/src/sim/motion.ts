//
// Copyright 2026 DXOS.org
//

import { type TerraConfigValues, type Vec3, add, makeSampler, normalize, radiusAt, scale, seaRadius } from '../engine';
import { type TerraObject } from '../types';
import { angleBetween, bearingTo, toUnit } from './geo';

/** Flight stage of a rocket, derived from flight fraction — never stored across calls. */
export type RocketPhase = 'boost' | 'cruise' | 'descent';

/**
 * A movable object's state at a single instant. Everything here is a pure function of
 * `(definition, config, elapsed)` — `route` and `windowIndex` are carried forward unchanged by
 * `evaluate` (routed kinds) or recomputed fresh each call (satellite, rocket); neither ever
 * accumulates history.
 */
export type ObjectState = {
  unit: Vec3;
  radius: number;
  bearing: number;
  route: Vec3[];
  windowIndex: number;
  phase: RocketPhase;
};

/** `elapsed` is seconds since the object's `spawnedAt` — always absolute, never a per-frame delta. */
export type MotionContext = { config: TerraConfigValues; elapsed: number };

/** Cruise altitude for planes, as a fraction of sea radius above the surface. */
const CRUISE_ALTITUDE = 0.06;

/** Peak altitude bump for a rocket's ballistic arc, as a fraction of sea radius. */
const BALLISTIC_APEX = 0.35;

/** Flight fraction below which a rocket is still in its boost phase. */
const BOOST_FRACTION = 0.15;

/** Flight fraction above which a rocket has entered descent. */
const DESCENT_FRACTION = 0.85;

/**
 * Length, in seconds, of a replan window. `evaluate` uses this only to turn a routed object's
 * `windowIndex` into an elapsed offset (`windowStart`); Task 6's `sim/engine.ts` owns the actual
 * replan recurrence and should import this value (× 1000 for its own ms-based scheduling) rather
 * than redefining it, so the two modules cannot drift apart.
 */
export const REPLAN_INTERVAL_SECONDS = 20;

/** Degrees to radians. */
const DEG = Math.PI / 180;

/** Stable fallback point used only when a definition is missing geo data it needs — never throw. */
const FALLBACK_UNIT: Vec3 = [0, 1, 0];

const clampNonNegative = (value: number): number => Math.max(0, value);

/** Interpolates along the great circle between two unit vectors. */
const slerp = (from: Vec3, to: Vec3, fraction: number): Vec3 => {
  const angle = angleBetween(from, to);
  if (angle < 1e-12) {
    return from;
  }
  const sin = Math.sin(angle);
  const left = Math.sin((1 - fraction) * angle) / sin;
  const right = Math.sin(fraction * angle) / sin;
  return normalize(add(scale(from, left), scale(to, right)));
};

/** Bearing of the last non-degenerate segment in a route, or 0 if every segment is degenerate. */
const finalBearing = (route: readonly Vec3[]): number => {
  for (let index = route.length - 2; index >= 0; index--) {
    if (angleBetween(route[index], route[index + 1]) >= 1e-12) {
      return bearingTo(route[index], route[index + 1]);
    }
  }
  return 0;
};

/**
 * The point at arc length `distance` along a great-circle polyline, its forward tangent as a
 * bearing, and whether the end of the route was reached. Pure function of `(route, distance)` —
 * this is the core of the determinism guarantee: no accumulator, so the same distance always
 * yields the same point regardless of how it was computed. Handles empty, single-point, and
 * zero-length-segment routes without throwing.
 */
export const walkRoute = (route: readonly Vec3[], distance: number): { unit: Vec3; bearing: number; done: boolean } => {
  if (route.length === 0) {
    return { unit: FALLBACK_UNIT, bearing: 0, done: true };
  }
  if (route.length === 1) {
    return { unit: route[0], bearing: 0, done: true };
  }

  const target = clampNonNegative(distance);
  let traveled = 0;
  for (let index = 0; index < route.length - 1; index++) {
    const from = route[index];
    const to = route[index + 1];
    const segment = angleBetween(from, to);
    if (segment < 1e-12) {
      // Zero-length segment (duplicate waypoint): contributes no distance, skip to avoid dividing by zero.
      continue;
    }
    if (traveled + segment >= target) {
      const fraction = (target - traveled) / segment;
      return { unit: slerp(from, to, fraction), bearing: bearingTo(from, to), done: false };
    }
    traveled += segment;
  }

  return { unit: route[route.length - 1], bearing: finalBearing(route), done: true };
};

/** A straight great-circle route between an object's source and target, used until Task 6 replans it over the nav grid. */
const routeFromEndpoints = (definition: TerraObject.TerraObject): Vec3[] => {
  const source = definition.source ? toUnit(definition.source) : undefined;
  const target = definition.target ? toUnit(definition.target) : undefined;
  if (source && target) {
    return [source, target];
  }
  if (source) {
    return [source];
  }
  if (target) {
    return [target];
  }
  return [FALLBACK_UNIT];
};

/** Radius for the routed kinds (boat, tank, plane); tank and only tank depends on terrain at its current position. */
const routedRadius = (kind: TerraObject.Kind, config: TerraConfigValues, unit: Vec3): number => {
  switch (kind) {
    case 'boat':
      return seaRadius(config);
    case 'plane':
      return seaRadius(config) * (1 + CRUISE_ALTITUDE);
    case 'tank': {
      const { elevation } = makeSampler(config);
      return Math.max(seaRadius(config), radiusAt(config, elevation(unit)));
    }
    default:
      return seaRadius(config);
  }
};

const evaluateRouted = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  context: MotionContext,
): ObjectState => {
  const windowStart = state.windowIndex * REPLAN_INTERVAL_SECONDS;
  const distance = definition.speed * clampNonNegative(context.elapsed - windowStart);
  const { unit, bearing } = walkRoute(state.route, distance);
  return {
    unit,
    radius: routedRadius(definition.kind, context.config, unit),
    bearing,
    route: state.route,
    windowIndex: state.windowIndex,
    phase: 'cruise',
  };
};

/** Closed-form position on a circular orbit inclined by `inclination` radians, at orbital angle `theta`. */
const orbitUnit = (theta: number, inclination: number): Vec3 => [
  Math.sin(theta) * Math.cos(inclination),
  Math.sin(theta) * Math.sin(inclination),
  Math.cos(theta),
];

/** Small forward step used to derive a satellite's bearing from its closed-form path, without feeding position back. */
const ORBIT_BEARING_EPSILON = 1e-4;

const evaluateOrbit = (definition: TerraObject.TerraObject, context: MotionContext): ObjectState => {
  const orbit = definition.orbit;
  if (!orbit) {
    // Malformed satellite definition: park at a stable fallback rather than throwing.
    return {
      unit: FALLBACK_UNIT,
      radius: seaRadius(context.config),
      bearing: 0,
      route: [],
      windowIndex: 0,
      phase: 'cruise',
    };
  }

  const angularRate = orbit.period > 0 ? (2 * Math.PI) / orbit.period : 0;
  const theta = orbit.phase + angularRate * context.elapsed;
  const inclination = orbit.inclination * DEG;
  const unit = orbitUnit(theta, inclination);
  const ahead = orbitUnit(theta + ORBIT_BEARING_EPSILON, inclination);

  return {
    unit,
    radius: seaRadius(context.config) * (1 + orbit.altitude),
    bearing: bearingTo(unit, ahead),
    route: [],
    windowIndex: 0,
    phase: 'cruise',
  };
};

const evaluateRocket = (definition: TerraObject.TerraObject, context: MotionContext): ObjectState => {
  const source = definition.source ? toUnit(definition.source) : FALLBACK_UNIT;
  const target = definition.target ? toUnit(definition.target) : FALLBACK_UNIT;
  const total = angleBetween(source, target);
  const traveled = definition.speed * clampNonNegative(context.elapsed);
  const fraction = total > 1e-12 ? Math.min(1, traveled / total) : 1;
  const { unit, bearing } = walkRoute([source, target], traveled);

  const phase: RocketPhase = fraction < BOOST_FRACTION ? 'boost' : fraction > DESCENT_FRACTION ? 'descent' : 'cruise';

  const { elevation } = makeSampler(context.config);
  const surface = Math.max(seaRadius(context.config), radiusAt(context.config, elevation(unit)));
  const apex = seaRadius(context.config) * (1 + BALLISTIC_APEX * Math.sin(Math.PI * fraction));

  return {
    unit,
    radius: Math.max(surface, apex),
    bearing,
    route: [source, target],
    windowIndex: 0,
    phase,
  };
};

/** The state of a freshly spawned object, before any replanning (Task 6) has run. */
export const initialState = (definition: TerraObject.TerraObject, config: TerraConfigValues): ObjectState => {
  switch (definition.kind) {
    case 'boat':
    case 'tank':
    case 'plane': {
      const route = routeFromEndpoints(definition);
      const { unit, bearing } = walkRoute(route, 0);
      return {
        unit,
        radius: routedRadius(definition.kind, config, unit),
        bearing,
        route,
        windowIndex: 0,
        phase: 'cruise',
      };
    }
    case 'satellite':
      return evaluateOrbit(definition, { config, elapsed: 0 });
    case 'rocket':
      return evaluateRocket(definition, { config, elapsed: 0 });
  }
};

/**
 * The object's state AT `context.elapsed` — pure and idempotent. Never takes a `dt`: the same
 * `elapsed` always produces the same result, regardless of what was evaluated before it, which is
 * what lets two peers rendering at different frame cadences converge on the same world.
 */
export const evaluate = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  context: MotionContext,
): ObjectState => {
  switch (definition.kind) {
    case 'boat':
    case 'tank':
    case 'plane':
      return evaluateRouted(state, definition, context);
    case 'satellite':
      return evaluateOrbit(definition, context);
    case 'rocket':
      return evaluateRocket(definition, context);
  }
};
