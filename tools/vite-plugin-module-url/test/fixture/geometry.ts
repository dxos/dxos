//
// Copyright 2026 DXOS.org
//

import { type Point, distance } from './shape.ts';

interface Measured<T> {
  readonly value: T;
  readonly unit: 'px';
}

export class Path {
  readonly #points: Point[] = [];

  add(point: Point): this {
    this.#points.push(point);
    return this;
  }

  length(): Measured<number> {
    const value = this.#points.slice(1).reduce((sum, point, index) => sum + distance(this.#points[index], point), 0);
    return { value, unit: 'px' } satisfies Measured<number>;
  }
}
