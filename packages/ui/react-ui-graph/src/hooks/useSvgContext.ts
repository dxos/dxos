//
// Copyright 2022 DXOS.org
//

import { type ZoomTransform } from 'd3';
import { createContext, useContext } from 'react';
import { type RefObject, createRef } from 'react';

import { raise } from '@dxos/debug';

import { EventEmitter, type Point, Scale, type Size } from '../util';

export type SVGContextOptions = {
  scale?: Scale;
  centered?: boolean;
};

/**
 * Contains a reference to the root SVG element and objects and configuration required by child nodes.
 */
export class SVGContext {
  private readonly _ref = createRef<SVGSVGElement>();

  private _scale: Scale;
  private _centered: boolean;
  private _size?: Size;
  private _center?: Point;

  readonly resized = new EventEmitter<SVGContext>();

  constructor({ scale = new Scale(), centered = true }: SVGContextOptions) {
    this._scale = scale;
    this._centered = centered;
  }

  get ref(): RefObject<SVGSVGElement> {
    return this._ref;
  }

  get svg(): SVGSVGElement {
    return this._ref.current!;
  }

  get scale(): Scale {
    return this._scale;
  }

  get center(): Point {
    return this._center!;
  }

  get size(): Size | undefined {
    return this._size;
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox
   */
  get viewBox() {
    const [x, y] = this.center;
    return `${x},${y},${this._size!.width},${this._size!.height}`;
  }

  setSize(size: Size): void {
    this._size = { ...size };
    this._center = this._centered ? [-Math.floor(size.width / 2), -Math.floor(size.height / 2)] : [0, 0];
    this.resized.emit(this);
  }

  setTransform(transform: ZoomTransform): void {
    if (this._scale.setTransform(transform)) {
      this.resized.emit(this);
    }
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Document/elementFromPoint
   * @param point
   */
  elementFromPoint(point: Point): Element {
    const [x, y] = point;
    const [cx, cy] = this._center!;
    return document.elementFromPoint(cx + x, cy + y)!; // TODO(burdon): Scale?
  }
}

const SVGContextType = createContext<SVGContext | undefined>(undefined);

export const SVGContextProvider = SVGContextType.Provider;

/**
 * Get SVG context from the React context.
 */
export const useSvgContext = (): SVGContext => useContext(SVGContextType) ?? raise(new Error('Missing SVGRoot'));
