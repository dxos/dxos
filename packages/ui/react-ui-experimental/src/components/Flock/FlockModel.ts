//
// Copyright 2026 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { Vec2 } from '../../util';

/**
 * One body in the flocking simulation.
 *
 * `id` is optional but enables identity-based reads — callers that seed boids from a
 * domain model (e.g. graph nodes) can later look up a boid's mutated position by id.
 *
 * `position`, `velocity`, and `acceleration` are mutated in place by the simulation
 * each tick — this is hot-loop code, so the Vec2 instances are reused rather than
 * replaced. The `boids` atom only emits when the array identity changes (i.e. on
 * `setBoids`), not on per-tick position drift.
 */
export type FlockBoid = {
  id?: string;
  position: Vec2;
  velocity: Vec2;
  acceleration?: Vec2;
  color?: string;
  /** Recent acceleration magnitudes; consumed by Movement / Grey colorings. */
  last?: number[];
  /**
   * Ring buffer of recent positions (newest at index 0). Rendered with decreasing
   * alpha to draw the visible trail. Cleared and refilled by the renderer per tick,
   * so consumers don't need to seed it. Allocated lazily.
   */
  trail?: Array<{ x: number; y: number }>;
};

/**
 * Reactive container for the boid array used by the `Flock` component.
 *
 * Two readers:
 *  - `Flock` subscribes via {@link subscribe} and starts a fresh simulation whenever
 *    {@link setBoids} replaces the array.
 *  - External code (e.g. an explorer that hands boids ids matching graph nodes) reads
 *    {@link boids} or {@link findBoid} to sample the latest mutated positions — useful
 *    when handing positions back to another visualisation on layout swap.
 */
export class FlockModel {
  readonly #boidsAtom: Atom.Writable<readonly FlockBoid[]>;

  constructor(
    private readonly _registry: Registry.Registry,
    initial: readonly FlockBoid[] = [],
  ) {
    this.#boidsAtom = Atom.make<readonly FlockBoid[]>(initial);
  }

  /** The effect-atom for direct subscription via the registry. */
  get boidsAtom(): Atom.Writable<readonly FlockBoid[]> {
    return this.#boidsAtom;
  }

  /** Current boids. Positions reflect the last simulation tick (mutated in place). */
  get boids(): readonly FlockBoid[] {
    return this._registry.get(this.#boidsAtom);
  }

  /** Replace the boid array atomically — Flock restarts its simulation on emit. */
  setBoids(boids: readonly FlockBoid[]): this {
    this._registry.set(this.#boidsAtom, boids);
    return this;
  }

  /** First boid whose `id` matches, or `undefined`. */
  findBoid(id: string): FlockBoid | undefined {
    return this.boids.find((b) => b.id === id);
  }

  /**
   * Subscribe to array-identity changes (setBoids). The callback is NOT invoked on
   * per-tick position mutations — those would flood for no benefit.
   */
  subscribe(cb: () => void): () => void {
    return this._registry.subscribe(this.#boidsAtom, cb);
  }
}
