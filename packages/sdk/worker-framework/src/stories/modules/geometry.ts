//
// Copyright 2026 DXOS.org
//

import { pipe } from 'effect/Function';

import { type HostedModule } from '../module-host-service.ts';
import { realm } from './realm.ts';
import { type Point, distance } from './vector.ts';

interface Measured<T> {
  readonly value: T;
  readonly unit: 'px';
}

class Path {
  readonly #points: Point[];

  constructor(points: readonly Point[]) {
    this.#points = [...points];
  }

  length(): Measured<number> {
    const value = this.#points.slice(1).reduce((sum, point, index) => sum + distance(this.#points[index], point), 0);
    return { value, unit: 'px' } satisfies Measured<number>;
  }
}

/** Exercises TS-only syntax, a relative import and a package import, compiled for the worker. */
export const module: HostedModule = {
  name: 'geometry',
  methods: {
    pathLength: (points: Point[]) => pipe(new Path(points), (path) => path.length()),
    realm,
  },
};
