//
// Copyright 2026 DXOS.org
//

//
// The motion library and math kit (ANIMATION.md §6.1): functions from time to place that generators compose, and the
// small helpers a generator may import. Pure and deterministic; a generator imports this module and nothing else.
//

import { type Easing, ease, seeded } from '@dxos/animation';
import { type Point } from '@dxos/scene';

import { type Polyline, flattenPath, measure, pointAlong } from '../utils/index.ts';
import { type GeneratorModule } from './types.ts';

export type { Easing, Point };
export type {
  BoundLink,
  BoundNode,
  GeneratorContext,
  GeneratorModule,
  Shape,
  StatefulGenerator,
  StatelessGenerator,
} from './types.ts';

/** Where a body is at a time; `done` once a finite motion has arrived. */
export type MotionState = { position: Point; angle?: number; done?: boolean };
export type Motion = (t: number) => MotionState;

/** Types a generator module's default export; it returns the definition as given. */
export const defineGenerator = <P = Record<string, unknown>, S = unknown>(
  module: GeneratorModule<P, S>,
): GeneratorModule<P, S> => module;

/** A route to follow: path data, a polyline, or a bound link. */
export type Route = string | readonly Point[] | { points: readonly Point[] };

const toPolyline = (route: Route): Polyline =>
  typeof route === 'string' ? measure(flattenPath(route).flat()) : measure('points' in route ? route.points : route);

/** Follows a route at `speed` scene units per second from t = 0, eased over its length; done at its end. */
export const along = (route: Route, { speed, easing }: { speed: number; easing?: Easing }): Motion => {
  const polyline = toPolyline(route);
  const duration = speed > 0 ? polyline.length / speed : 0;
  return (t) => {
    const progress = duration > 0 ? Math.min(1, Math.max(0, t / duration)) : 1;
    const { position, angle } = pointAlong(polyline, ease(easing, progress) * polyline.length);
    return { position, angle, done: progress >= 1 };
  };
};

/** Circles `center` once every `period` seconds, starting at `phase` (radians); never done. */
export const orbit = (
  center: Point,
  { radius, period, phase = 0 }: { radius: number; period: number; phase?: number },
): Motion => {
  return (t) => {
    const angle = phase + (period > 0 ? (t / period) * Math.PI * 2 : 0);
    return {
      position: { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius },
      angle: angle + Math.PI / 2,
    };
  };
};

/** Moves from `from` to `to` over `duration` seconds, eased: an arrival into a cell. */
export const settle = (
  from: Point,
  to: Point,
  { duration, easing = 'ease-out' }: { duration: number; easing?: Easing },
): Motion => {
  return (t) => {
    const progress = duration > 0 ? Math.min(1, Math.max(0, t / duration)) : 1;
    const amount = ease(easing, progress);
    return {
      position: { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount },
      angle: Math.atan2(to.y - from.y, to.x - from.x),
      done: progress >= 1,
    };
  };
};

/**
 * Runs `first` until it is done, then `next` from that moment. `first` must be finite (along, settle). Not named `then`
 * (ANIMATION.md §6.1): a module exporting `then` is a thenable, and awaiting its import would never resolve.
 */
export const andThen = (first: Motion, next: Motion): Motion => {
  // The moment `first` finishes, found once by doubling then bisecting, so `then` stays a pure function of time.
  let finished: number | undefined;
  const end = () => {
    if (finished !== undefined) {
      return finished;
    }
    let high = 1 / 64;
    while (!first(high).done && high < 3600) {
      high *= 2;
    }
    let low = 0;
    for (let iteration = 0; iteration < 40; iteration++) {
      const middle = (low + high) / 2;
      if (first(middle).done) {
        high = middle;
      } else {
        low = middle;
      }
    }
    finished = high;
    return finished;
  };
  return (t) => {
    const at = end();
    return t < at ? first(t) : next(t - at);
  };
};

/** `motion` with a smooth wander of up to `amplitude` scene units added, the same for the same seed. */
export const jitter = (
  motion: Motion,
  { amplitude, seed = 0, frequency = 1 }: { amplitude: number; seed?: number; frequency?: number },
): Motion => {
  const random = seeded(seed);
  // Three incommensurate sines per axis read as noise and stay a pure function of time.
  const waves = Array.from({ length: 6 }, () => ({ rate: 0.5 + random() * 1.5, phase: random() * Math.PI * 2 }));
  const wave = (t: number, offset: number) =>
    [0, 1, 2].reduce((sum, index) => {
      const { rate, phase } = waves[offset + index];
      return sum + Math.sin(t * frequency * rate * Math.PI * 2 + phase);
    }, 0) / 3;
  return (t) => {
    const state = motion(t);
    return {
      ...state,
      position: { x: state.position.x + wave(t, 0) * amplitude, y: state.position.y + wave(t, 3) * amplitude },
    };
  };
};

//
// Math kit.
//

export const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
export { ease };

// Part of the one module a generator may import; the runtime seeds `ctx.random` with the same functions.
export { hashSeed, seeded } from '@dxos/animation';

/** A point along a path's outline at a fraction (0 to 1) of its length: for drawing on a shape's edge. */
export const pointOnPath = (d: string, fraction: number): Point => {
  const polyline = toPolyline(d);
  return pointAlong(polyline, clamp(fraction, 0, 1) * polyline.length).position;
};
