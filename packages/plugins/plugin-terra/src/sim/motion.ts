//
// Copyright 2026 DXOS.org
//

import { type TerraConfigValues, type Vec3, seaRadius } from '../engine';
import { type TerraObject } from '../types';
import { BOOST_FRACTION, DESCENT_FRACTION, behaviorFor } from './behaviors';
import { angleBetween, bearingTo, toUnit } from './geo';
import { FALLBACK_UNIT, clampNonNegative, walkRoute } from './path';

/** Flight stage of a rocket, derived from flight fraction — never stored across calls. */
export type RocketPhase = 'boost' | 'cruise' | 'descent';

/**
 * A movable object's state at a single instant. Everything here is a pure function of
 * `(definition, config, elapsed)` — `route`, `legStart`, and `leg` are carried forward unchanged by
 * `evaluate` (routed kinds) or recomputed fresh each call (satellite, rocket); neither ever
 * accumulates history.
 */
export type ObjectState = {
  unit: Vec3;
  radius: number;
  bearing: number;
  route: Vec3[];
  /** Elapsed seconds (since `spawnedAt`) at which the current `leg` began; `route`'s arc length is walked starting from this instant, not from a fixed-cadence window. */
  legStart: number;
  /** Which destination in this object's re-targeting sequence it is currently walking toward; `sim/engine.ts` owns the arrival-driven recurrence that advances it. */
  leg: number;
  /** Whether the object has reached the end of `route` at this `elapsed`. */
  arrived: boolean;
  /** Nose angle off the local horizontal in radians, positive nose-up; set by the object's behavior. */
  pitch: number;
  phase: RocketPhase;
  /** A rocket's progress through its ballistic arc, `[0, 1]` (launch to touchdown); `0` for every other kind. */
  flightFraction: number;
  /** Progress through the explosion a rocket leaves where it came down, `[0, 1]`: `0` until it lands, `1` once the blast has faded. The rocket itself is gone for any value above `0`. */
  explosion: number;
};

/** `elapsed` is seconds since the object's `spawnedAt` — always absolute, never a per-frame delta. */
export type MotionContext = { config: TerraConfigValues; elapsed: number };

/** Degrees to radians. */
const DEG = Math.PI / 180;

/** How long a rocket's impact explosion burns, in simulated seconds. */
const EXPLOSION_SECONDS = 2.5;

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

const evaluateRouted = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  context: MotionContext,
): ObjectState => {
  const distance = definition.speed * clampNonNegative(context.elapsed - state.legStart);
  const { unit, bearing, done } = walkRoute(state.route, distance);
  const { radius, pitch } = behaviorFor(definition.kind).attitude({
    definition,
    config: context.config,
    unit,
    route: state.route,
    distance,
    flightFraction: 0,
  });
  return {
    unit,
    radius,
    bearing,
    route: state.route,
    legStart: state.legStart,
    leg: state.leg,
    arrived: done,
    pitch,
    phase: 'cruise',
    flightFraction: 0,
    explosion: 0,
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
      legStart: 0,
      leg: 0,
      arrived: false,
      pitch: 0,
      phase: 'cruise',
      flightFraction: 0,
      explosion: 0,
    };
  }

  const angularRate = orbit.period > 0 ? (2 * Math.PI) / orbit.period : 0;
  const theta = orbit.phase + angularRate * context.elapsed;
  const inclination = orbit.inclination * DEG;
  const unit = orbitUnit(theta, inclination);
  const ahead = orbitUnit(theta + ORBIT_BEARING_EPSILON, inclination);
  const { radius, pitch } = behaviorFor('satellite').attitude({
    definition,
    config: context.config,
    unit,
    route: [],
    distance: 0,
    flightFraction: 0,
  });

  return {
    unit,
    radius,
    bearing: bearingTo(unit, ahead),
    route: [],
    legStart: 0,
    leg: 0,
    arrived: false,
    pitch,
    flightFraction: 0,
    phase: 'cruise',
    explosion: 0,
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
  const { radius, pitch } = behaviorFor('rocket').attitude({
    definition,
    config: context.config,
    unit,
    route: [source, target],
    distance: traveled,
    flightFraction: fraction,
  });

  // The instant it comes down is closed-form (the arc over its speed), so how far the blast has
  // burnt through follows from `elapsed` alone — no landing event to catch and remember.
  const impactElapsed = definition.speed > 0 ? total / definition.speed : Infinity;
  const explosion =
    fraction >= 1 ? Math.min(1, (clampNonNegative(context.elapsed) - impactElapsed) / EXPLOSION_SECONDS) : 0;

  return {
    unit,
    radius,
    bearing,
    pitch,
    route: [source, target],
    legStart: 0,
    leg: 0,
    arrived: fraction >= 1,
    phase,
    flightFraction: fraction,
    explosion,
  };
};

/** The state of a freshly spawned object, before any replanning (Task 6) has run. */
export const initialState = (definition: TerraObject.TerraObject, config: TerraConfigValues): ObjectState => {
  switch (definition.kind) {
    case 'boat':
    case 'tank':
    case 'plane': {
      const route = routeFromEndpoints(definition);
      const { unit, bearing, done } = walkRoute(route, 0);
      const { radius, pitch } = behaviorFor(definition.kind).attitude({
        definition,
        config,
        unit,
        route,
        distance: 0,
        flightFraction: 0,
      });
      return {
        unit,
        radius,
        bearing,
        route,
        legStart: 0,
        leg: 0,
        arrived: done,
        pitch,
        phase: 'cruise',
        flightFraction: 0,
        explosion: 0,
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
