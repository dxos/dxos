//
// Copyright 2022 DXOS.org
//

import { Modifiers, Point, Screen, ScreenBounds, Scale, Vertex } from '@dxos/gem-x';

import { ElementData, ElementDataType, ElementId, ElementType } from '../model';
import { D3Callable } from '../types';

export type ControlPoint = { i: number, point: Point }

export interface ElementGetter {
  getElement (id: ElementId): Control<any> | undefined
}

export enum ElementState {
  NORMAL,
  SELECTED,
  EDITING
}

export type SelectionModel = {
  element: ElementData<any> // TODO(burdon): Multiple.
  state?: ElementState
}

export interface ControlConstructor<T extends ElementDataType> {
  new (
    cache: ElementGetter,
    scale: Scale,
    element?: ElementData<T>,
    onRepaint?: () => void,
    onSelect?: (element: ElementData<T>) => void,
    onUpdate?: (element: ElementData<T>, commit?: boolean) => void,
    onCreate?: (type: ElementType, data: T) => void
  ): Control<T>;
}

/**
 * Graphical control.
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element#graphics_elements
 */
export abstract class Control<T extends ElementDataType> {
  // TODO(burdon): NOTE: Currently conflates updated data and updated state.
  private _modified = true;

  private _state = ElementState.NORMAL;

  private _hover = false;

  // TODO(burdon): Manipulate clone until commit.
  private _data;

  constructor (
    private readonly _elements: ElementGetter,
    private readonly _scale: Scale,
    private readonly _element?: ElementData<T>,
    private readonly _onRepaint?: () => void,
    private readonly _onSelect?: (element: ElementData<T>, edit?: boolean) => void,
    private readonly _onUpdate?: (element: ElementData<T>, commit?: boolean) => void,
    private readonly _onCreate?: (type: ElementType, data: T) => void
  ) {
    this._data = this._element?.data;
  }

  get elements () {
    return this._elements;
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

  get modified () {
    return this._modified;
  }

  get state () {
    return this._state;
  }

  get active () {
    return this.selected || this.editing;
  }

  get selected () {
    return this._state === ElementState.SELECTED;
  }

  get editing () {
    return this._state === ElementState.EDITING;
  }

  get hover () {
    return this._hover;
  }

  get resizable () {
    return Boolean(this._element);
  }

  toString () {
    return `Element(${this.type}: ${this._element.id})`;
  }

  setState (state: ElementState) {
    if (this._state !== state) {
      this._state = state;
      this._modified = true;
    }
  }

  onSelect (select: boolean) {
    if (select && !this.selected) {
      this._onSelect?.(this.element);
    } else if (!select && this.selected) {
      this._onSelect?.(undefined);
    }
  }

  onEdit (edit: boolean) {
    if (edit && !this.editing) {
      this._onSelect?.(this.element, true);
    } else if (!edit && this.editing) {
      this._onSelect?.(undefined);
    }
  }

  onHover (hover: boolean) {
    this._modified = true;
    this._hover = hover;
    // TODO(burdon): Only repaint this element; construct with reference to group?
    this._onRepaint?.();
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
    this._modified = true;
    this._onUpdate?.(this.element, commit);
  }

  draw () {
    this._modified = false;
    return this.drawable();
  }

  abstract readonly type: ElementType;

  /**
   * Callable renderer.
   */
  abstract drawable (): D3Callable;

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
  updateControlPoint (point: ControlPoint, delta: Point, commit?: boolean, target?: Control<any>): T {
    throw new Error();
  }

  /**
   * Get connection vertex for line connections.
   */
  getConnectionPoint (): Vertex {
    return undefined;
  }
}
