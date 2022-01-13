//
// Copyright 2022 DXOS.org
//

import { Modifiers, Point, Screen, ScreenBounds, Scale } from '@dxos/gem-x';

import { Element, ElementDataType, ElementType } from '../model';
import { D3Callable } from '../types';

export type ControlPoint = { i: number, point: Point }

/**
 * Graphical element.
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element#graphics_elements
 */
export abstract class BaseElement<T extends ElementDataType> {
  private _selected = false;

  // TODO(burdon): Manipulate clone until commit.
  private _data;

  constructor (
    private readonly _scale: Scale,
    private readonly _element?: Element<T>,
    private readonly _onSelect?: (element: Element<T>) => void,
    private readonly _onUpdate?: (element: Element<T>, commit?: boolean) => void,
    private readonly _onCreate?: (type: ElementType, data: T) => void
  ) {
    this._data = this._element?.data;
  }

  get scale () {
    return this._scale;
  }

  get element () {
    return this._element;
  }

  get data () {
    return this._data;
  }

  get selected () {
    return this._selected;
  }

  get resizable () {
    return Boolean(this._element);
  }

  toString () {
    return `Element(${this._element.id})`;
  }

  setSelected (selected: boolean) {
    this._selected = selected;
  }

  onSelect (select: boolean) {
    if (select && !this.selected) {
      this._onSelect?.(this.element);
    } else if (!select && this.selected) {
      this._onSelect?.(undefined);
    }
  }

  onCreate (data: T) {
    this._data = data;
    this._onCreate?.(this.type, this._data);
  }

  onUpdate (data: T, commit?: boolean) {
    this._data = data;

    // TODO(burdon): Revert _data if no ACK.
    if (commit) {
      this._element.data = data;
    }
    this._onUpdate?.(this.element, commit);
  }

  abstract readonly type: ElementType;

  /**
   * Callable renderer.
   */
  abstract draw (): D3Callable;

  /**
   * Create bounding box from data.
   */
  getBounds (): ScreenBounds {
    throw new Error();
  }

  /**
   * Create element data from bounds.
   * @param bounds
   * @param mod
   * @param commit
   */
  createFromBounds (bounds: ScreenBounds, mod?: Modifiers, commit?: boolean): T {
    throw new Error();
  }

  /**
   * Create element data from points.
   * @param p1
   * @param p2
   * @param mod
   * @param commit
   */
  createFromExtent (p1: Point, p2: Point, mod?: Modifiers, commit?: boolean): T {
    return this.createFromBounds(Screen.createBounds(p1, p2, mod));
  }

  /**
   * Get control points.
   */
  getControlPoints (): ControlPoint[] {
    return [];
  }

  /**
   * Update referenced point.
   * @param point
   * @param delta
   * @param commit
   */
  updateControlPoint (point: ControlPoint, delta: Point, commit?: boolean): T {
    throw new Error();
  }
}
