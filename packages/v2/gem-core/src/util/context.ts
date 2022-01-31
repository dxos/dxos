//
// Copyright 2022 DXOS.org
//

import type { ZoomTransform } from 'd3';
import { useMemo } from 'react';

import { EventEmitter } from './events';
import { Scale } from './scale';
import { Point } from './screen';

export const defaultScale = new Scale(32);

// TODO(burdon): Move.
export type Size = { width: number, height: number }

/**
 *
 */
export class SvgContext {
  readonly resize = new EventEmitter<SvgContext>();

  private _svg: SVGSVGElement;
  private _size: Size;
  private _center: Point;

  constructor (
    private readonly _scale = defaultScale,
    private readonly _centered = true
  ) {}

  get svg (): SVGSVGElement {
    return this._svg;
  }

  get scale (): Scale {
    return this._scale;
  }

  get center (): Point {
    return this._center;
  }

  get size (): Size {
    return this._size
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox
   */
  get viewBox () {
    const [x, y] = this.center;
    return `${x},${y},${this._size.width},${this._size.height}`;
  }

  setSvg (svg: SVGSVGElement) {
    this._svg = svg;
  }

  setSize (size: Size) {
    const cx = -Math.floor(size.width / 2);
    const cy = -Math.floor(size.height / 2);
    this._size = size;
    this._center = this._centered ? [cx, cy] : [0, 0];
    this.resize.emit(this);
  }

  setTransform (transform: ZoomTransform) {
    this._scale.setTransform(transform);
    this.resize.emit(this);
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Document/elementFromPoint
   * @param point
   */
  elementFromPoint (point: Point): Element {
    const [x, y] = point;
    const [cx, cy] = this._center;
    return document.elementFromPoint(cx + x, cy + y); // TODO(burdon): Scale?
  }
}

export const useContext = (scale: Scale = defaultScale) => {
  return useMemo(() => new SvgContext(scale), [scale])
}
