//
// Copyright 2022 DXOS.org
//

import { Modifiers, ScreenBounds, Scale } from '@dxos/gem-x';

import { Element, ElementDataType, ElementType } from '../model';
import { D3Callable } from '../types';

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
    private readonly _onUpdate?: (element: Element<T>) => void,
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

  onUpdate (data: T) {
    this._data = data;

    // TODO(burdon): Don't update until commit.
    if (this._element) {
      this._element.data = data;
    }

    this._onUpdate?.(this.element);
  }

  abstract readonly type: ElementType;

  /**
   * Create element data from bounds.
   * @param bounds
   * @param mod
   * @param commit
   */
  abstract createData (bounds: ScreenBounds, mod?: Modifiers, commit?: boolean): T;

  /**
   * Create bounding box from data.
   */
  abstract createBounds (): ScreenBounds;

  /**
   * Callable renderer.
   */
  abstract draw (): D3Callable;
}
