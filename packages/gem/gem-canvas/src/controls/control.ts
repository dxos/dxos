//
// Copyright 2022 DXOS.org
//

import { D3Callable, Modifiers, Point, Screen, ScreenBounds, Scale, Vertex } from '@dxos/gem-core';

import { ElementData, ElementDataType, ElementId, ElementType } from '../model';
import { Connection, ControlHandle } from './frame';

export interface ControlContext {
  scale: () => Scale
  debug: () => boolean
  draggable: () => boolean
}

export interface ControlGetter {
  getControl (id: ElementId): Control<any> | undefined
}

export enum ControlState {
  NORMAL,
  SELECTED,
  EDITING
}

export type SelectionModel = {
  element: ElementData<any> // TODO(burdon): Multiple.
  state?: ControlState
}

export interface ControlConstructor<T extends ElementDataType> {
  new (
    context: ControlContext,
    elements: ControlGetter,
    element?: ElementData<T>,
    onRepaint?: () => void,
    onSelect?: (element: ElementData<T>) => void,
    onUpdate?: (element: ElementData<T>, commit?: boolean) => void,
    onCreate?: (type: ElementType, data: T) => void
  ): Control<T>
}

/**
 * Graphical control.
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element#graphics_elements
 */
export abstract class Control<T extends ElementDataType> {
  // TODO(burdon): Combine state, hover, capabilities, etc.
  // TODO(burdon): NOTE: Currently conflates updated data and updated state.
  private _modified = true; // TODO(burdon): Rename repaint?
  private _state = ControlState.NORMAL;
  private _hover = false;

  // Transient data (during edit until commit).
  private _data: T = undefined;

  constructor (
    private readonly _context: ControlContext,
    private readonly _elements: ControlGetter,
    private _element?: ElementData<T>,
    private readonly _onRepaint?: () => void,
    private readonly _onSelect?: (element: ElementData<T>, edit?: boolean) => void,
    private readonly _onUpdate?: (element: ElementData<T>, commit?: boolean) => void,
    private readonly _onCreate?: (type: ElementType, data: T) => void
  ) {}

  get elements () {
    return this._elements;
  }

  get scale () {
    return this._context.scale();
  }

  get debug () {
    return this._context.debug();
  }

  get draggable () {
    return this._context.draggable();
  }

  get element () {
    return this._element;
  }

  get data () {
    return this._data ?? this._element?.data;
  }

  get modified () {
    return this._modified;
  }

  get editable () {
    return Boolean(this._onUpdate);
  }

  get state () {
    return this._state;
  }

  get active () {
    return this.selected || this.editing;
  }

  get selected () {
    return this._state === ControlState.SELECTED;
  }

  get editing () {
    return this._state === ControlState.EDITING;
  }

  get connections () {
    return this._hover && this.editable && !this.selected && !this.editing;
  }

  get resizable () {
    return this.editable && this.selected && this._element;
  }

  toString () {
    return `Control(${this.type}: ${this._element.id})`;
  }

  /**
   * Update data.
   * @param element
   */
  update (element: ElementData<T>) {
    this._element = element;
    this._data = element.data;
    this._modified = true;
  }

  /**
   * Called by framework (not on control directly).
   * @param state
   */
  setState (state: ControlState) {
    if (this._state !== state) {
      this._state = state;
      this._modified = true;
      this._hover = false;
    }
  }

  //
  // Event handlers.
  // TODO(burdon): Be clearer on who calls these methods and when.
  //

  onSelect (select: boolean) {
    if (select && !this.selected) {
      this._onSelect?.(this.element);
    } else if (!select && this.selected) {
      this._onSelect?.(undefined);
    }
  }

  onEdit (edit: boolean) {
    this._hover = false;
    if (edit && !this.editing) {
      this._onSelect?.(this.element, true);
    } else if (!edit && this.editing) {
      this._onSelect?.(undefined);
    }
  }

  onHover (hover: boolean) {
    this._modified = true;
    this._hover = hover;
    this._onRepaint?.(); // TODO(burdon): Event.
  }

  onCreate (data: T) {
    this._onCreate?.(this.type, data);
  }

  onUpdate (data: T, commit: boolean) {
    // TODO(burdon): Revert _data if no ACK.
    if (commit) {
      this._element.data = data;
    } else {
      this._data = data;
    }

    this._modified = true;
    this._onUpdate?.(this.element, commit);
    if (commit) {
      this._data = undefined;
    }
  }

  draw () {
    this._modified = false;
    return this.drawable;
  }

  abstract readonly type: ElementType;

  /**
   * Callable renderer.
   */
  // TODO(burdon): Split into main element group and cursor group.
  abstract drawable: D3Callable;

  /**
   * Create bounding box from data.
   */
  getBounds (): ScreenBounds {
    throw new Error();
  }

  /**
   * Check if bounds meet minimums.
   * @param data
   */
  checkBounds (data: T): boolean {
    return true;
  }

  /**
   * Create element data from bounds.
   * @param bounds
   * @param mod
   * @param snap
   */
  createFromBounds (bounds: ScreenBounds, mod?: Modifiers, snap?: boolean): T {
    throw new Error();
  }

  /**
   * Create element data from points.
   * @param p1
   * @param p2
   * @param mod
   * @param snap
   */
  createFromExtent (p1: Point, p2: Point, mod?: Modifiers, snap?: boolean): T {
    return this.createFromBounds(Screen.createBounds(p1, p2, mod), mod, snap);
  }

  /**
   * Get control points.
   */
  getControlPoints (): ControlHandle[] {
    return [];
  }

  /**
   * Update referenced point.
   * @param point             Point being updated.
   * @param delta             Dragged delta.
   * @param commit            Commit when released.
   * @param connection        Connection point.
   */
  updateControlPoint (
    point: ControlHandle,
    delta: Point,
    commit?: boolean,
    connection?: Connection
  ): T {
    throw new Error();
  }

  /**
   * Get connection vertex for line connections.
   */
  getConnectionPoint (handle?: string): Vertex {
    return undefined;
  }
}
