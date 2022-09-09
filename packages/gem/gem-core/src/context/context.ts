//
// Copyright 2022 DXOS.org
//

import type { ZoomTransform } from 'd3';
import { RefObject, createRef } from 'react';

import { EventEmitter, Point, Size } from '../util';
import { Scale } from './scale';

/**
 * Contains a reference to the root SVG element and objects and configuraiton required by child nodes.
 */
export class SVGContext {
  readonly resized = new EventEmitter<SVGContext>();

  private readonly _ref = createRef<SVGSVGElement>();
  private _size: Size;
  private _center: Point;

  constructor (
    private readonly _scale: Scale = new Scale(),
    private readonly _centered: boolean = true
  ) {}

  get ref (): RefObject<SVGSVGElement> {
    return this._ref;
  }

  get svg (): SVGSVGElement {
    return this._ref.current;
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

  setSize (size: Size) {
    const cx = -Math.floor(size.width / 2);
    const cy = -Math.floor(size.height / 2);
    this._size = size;
    this._center = this._centered ? [cx, cy] : [0, 0];
    this.resized.emit(this);
  }

  setTransform (transform: ZoomTransform) {
    this._scale.setTransform(transform);
    this.resized.emit(this);
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
