//
// Copyright 2026 DXOS.org
//

import { type ZoomTransform, zoomIdentity } from 'd3';

import { EventEmitter } from './event-emitter';
import { type Point, type Rect, type Size } from './types';

/**
 * Pure viewport state. No DOM.
 */
export class Viewport {
  #size: Size = { width: 0, height: 0 };
  #transform: ZoomTransform = zoomIdentity;

  readonly resized = new EventEmitter<Size>();
  readonly transformed = new EventEmitter<ZoomTransform>();
  readonly frame = new EventEmitter<{ t: number }>();

  get size(): Size {
    return this.#size;
  }

  get transform(): ZoomTransform {
    return this.#transform;
  }

  get scale(): number {
    return this.#transform.k;
  }

  setSize(size: Size): void {
    if (this.#size.width === size.width && this.#size.height === size.height) {
      return;
    }
    this.#size = { ...size };
    this.resized.emit(this.#size);
  }

  setTransform(t: ZoomTransform): void {
    if (this.#transform.x === t.x && this.#transform.y === t.y && this.#transform.k === t.k) {
      return;
    }
    this.#transform = t;
    this.transformed.emit(t);
  }

  /**
   * Map a point from world coordinates to screen (CSS pixel) coordinates using the current transform.
   */
  worldToScreen([x, y]: Point): Point {
    const { x: tx, y: ty, k } = this.#transform;
    return [x * k + tx, y * k + ty];
  }

  /**
   * Map a point from screen (CSS pixel) coordinates to world coordinates.
   */
  screenToWorld([sx, sy]: Point): Point {
    const { x: tx, y: ty, k } = this.#transform;
    return [(sx - tx) / k, (sy - ty) / k];
  }

  /**
   * Return the visible world-space rectangle for the current size and transform.
   */
  visibleBounds(): Rect {
    const tl = this.screenToWorld([0, 0]);
    const br = this.screenToWorld([this.#size.width, this.#size.height]);
    return { x: tl[0], y: tl[1], width: br[0] - tl[0], height: br[1] - tl[1] };
  }

  tick(t: number): void {
    this.frame.emit({ t });
  }
}
