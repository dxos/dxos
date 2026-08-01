//
// Copyright 2026 DXOS.org
//

import { type TerraConfigValues, type Vec3, makeSampler, radiusAt, seaRadius } from '../engine';
import { type TerraObject } from '../types';
import { routeLength, walkRouteSeries } from './path';

/** Cruise altitude for planes, as a fraction of sea radius above the surface. */
export const CRUISE_ALTITUDE = 0.06;

/** Peak altitude bump for a rocket's ballistic arc, as a fraction of sea radius. */
export const BALLISTIC_APEX = 0.35;

const DEG = Math.PI / 180;

/**
 * How far ahead, in radians of arc, a plane scans the terrain it is flying toward. This is the
 * range in which a mountain can begin to lift the plane; combined with `PLANE_MAX_PITCH` it also
 * caps how much terrain the plane can answer at all — anything higher than a full-rate climb over
 * this arc can reach is met at whatever altitude the climb has managed.
 */
const PLANE_LOOKAHEAD = 0.09;

/**
 * How far behind it also looks, which is what makes the descent back to cruise gradual: terrain
 * just behind still holds the plane up, less and less as it recedes.
 */
const PLANE_LOOKBEHIND = 0.045;

/**
 * Spacing of the terrain samples across that window, and the arc the climb rate is measured over.
 * Every sample is an elevation lookup and `evaluate` runs hundreds of times a frame under the trail
 * sampler (see DESIGN.md), so this is the whole cost of the behavior — but too coarse a spacing
 * steps over a narrow ridge.
 */
const PLANE_SAMPLE_SPACING = 0.015;

/** Clearance held above the terrain, as a fraction of sea radius. */
const PLANE_TERRAIN_CLEARANCE = 0.02;

/** Climb/descent limit. The altitude profile is built so it is never exceeded, rather than clipped after the fact. */
const PLANE_MAX_PITCH = 25 * DEG;

/**
 * Arc either side of the plane that the nose angle is measured across. Reading the profile's slope
 * over a span rather than at a point is what carries the nose smoothly through a summit, where the
 * climb becomes a descent within a single sample: over this baseline the two average out into a
 * gradual nose-over instead of a one-frame flip from +25° to -25°.
 */
const PLANE_PITCH_BASELINE = 0.015;

/** Flight fraction below which a rocket is still in its boost phase. */
export const BOOST_FRACTION = 0.15;

/** Flight fraction above which a rocket has entered descent. */
export const DESCENT_FRACTION = 0.85;

/** Everything a behavior may consult. Kinds use the subset they need; all of it is derived from `(definition, config, elapsed)`, so behaviors stay as closed-form as the motion controllers they extend. */
export type BehaviorInput = {
  definition: TerraObject.TerraObject;
  config: TerraConfigValues;
  /** Where the object is at this instant. */
  unit: Vec3;
  /** The route being walked, for kinds that look ahead along it. */
  route: readonly Vec3[];
  /** Arc length walked along `route` at this instant. */
  distance: number;
  /** Progress through a ballistic arc, `[0, 1]`, for kinds that fly one. */
  flightFraction: number;
};

/** How an object sits at an instant: how far from the planet's centre, and how its nose is angled off the local horizontal (radians, positive nose-up). */
export type Attitude = { radius: number; pitch: number };

/**
 * The part of an object's state that is specific to its kind, layered on the motion its route (or
 * orbit, or arc) already determines. Motion answers *where*; a behavior answers *how it flies
 * there* — the altitude it holds and the attitude it holds it at.
 */
export type Behavior = {
  attitude: (input: BehaviorInput) => Attitude;
};

const clamp = (value: number, limit: number): number => Math.min(limit, Math.max(-limit, value));

/** Terrain height under `unit`, never below sea level. */
const surfaceRadius = (config: TerraConfigValues, unit: Vec3): number => {
  const { elevation } = makeSampler(config);
  return Math.max(seaRadius(config), radiusAt(config, elevation(unit)));
};

/**
 * The altitude a plane holds now, and what it held/will hold a `PLANE_PITCH_BASELINE` either side —
 * all from one pass over the same terrain samples, since the other two only re-weight them.
 *
 * A peak `gap` ahead does not demand its full clearance yet: the plane has that much arc left to
 * climb, so it demands `clearance - maxClimb * gap`. Taking the highest such demand over the window
 * produces an altitude profile that rises into a mountain at the climb limit, tops out at clearance
 * over it, and — because terrain behind is weighted the same way — settles back to cruise at that
 * same limit once it is past. The plane therefore never dives at a ridge and never drops out of the
 * sky behind one.
 */
const planeAltitude = ({
  config,
  route,
  distance,
}: BehaviorInput): { radius: number; behind: number; ahead: number } => {
  const { elevation } = makeSampler(config);
  const sea = seaRadius(config);
  const cruise = sea * (1 + CRUISE_ALTITUDE);
  // Radius gained per radian of arc at the climb limit.
  const climb = Math.tan(PLANE_MAX_PITCH) * sea;
  const span = PLANE_LOOKBEHIND + PLANE_LOOKAHEAD + 2 * PLANE_PITCH_BASELINE;
  const samples = Math.round(span / PLANE_SAMPLE_SPACING);

  const first = -PLANE_LOOKBEHIND - PLANE_PITCH_BASELINE;

  let radius = cruise;
  let behind = cruise;
  let ahead = cruise;
  walkRouteSeries(route, distance + first, PLANE_SAMPLE_SPACING, samples + 1, (sample, at) => {
    const offset = first + sample * PLANE_SAMPLE_SPACING;
    const clearance = radiusAt(config, elevation(at)) + sea * PLANE_TERRAIN_CLEARANCE;
    // The same terrain, weighted as each of the three vantage points along the route sees it.
    const demand = (gap: number): number =>
      gap >= -PLANE_LOOKBEHIND && gap <= PLANE_LOOKAHEAD ? clearance - climb * Math.abs(gap) : cruise;
    radius = Math.max(radius, demand(offset));
    behind = Math.max(behind, demand(offset + PLANE_PITCH_BASELINE));
    ahead = Math.max(ahead, demand(offset - PLANE_PITCH_BASELINE));
  });

  return { radius, behind, ahead };
};

const level = (radius: number): Attitude => ({ radius, pitch: 0 });

/**
 * One behavior per kind. Adding a kind means adding an entry here rather than another arm of a
 * switch inside the motion controllers.
 */
export const behaviors: Record<TerraObject.Kind, Behavior> = {
  boat: {
    attitude: ({ config }) => level(seaRadius(config)),
  },

  tank: {
    attitude: ({ config, unit }) => level(surfaceRadius(config, unit)),
  },

  plane: {
    attitude: (input) => {
      const { radius, behind, ahead } = planeAltitude(input);
      // The nose follows the altitude profile: altitude gained over the arc it is gained across.
      const pitch = Math.atan2(ahead - behind, 2 * PLANE_PITCH_BASELINE * seaRadius(input.config));
      return { radius, pitch: clamp(pitch, PLANE_MAX_PITCH) };
    },
  },

  rocket: {
    attitude: ({ config, unit, route, flightFraction }) => {
      const sea = seaRadius(config);
      const apex = sea * (1 + BALLISTIC_APEX * Math.sin(Math.PI * flightFraction));
      const radius = Math.max(surfaceRadius(config, unit), apex);
      // The nose points where the rocket is actually going: its own flight-path angle, the climb
      // rate of the ballistic profile over the ground speed it is covering the arc at. A scripted
      // angle (a cosine from +90° to -90°, say) is far steeper than a lofted arc really flies, and
      // the rocket visibly skids — pointing up while travelling forward.
      const total = routeLength(route);
      const climbRate = total > 0 ? (sea * BALLISTIC_APEX * Math.PI * Math.cos(Math.PI * flightFraction)) / total : 0;
      return { radius, pitch: Math.atan2(climbRate, radius) };
    },
  },

  satellite: {
    attitude: ({ config, definition }) => level(seaRadius(config) * (1 + (definition.orbit?.altitude ?? 0))),
  },
};

/** The behavior for `kind`. */
export const behaviorFor = (kind: TerraObject.Kind): Behavior => behaviors[kind];
