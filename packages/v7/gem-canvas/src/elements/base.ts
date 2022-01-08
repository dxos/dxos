//
// Copyright 2022 DXOS.org
//

import { Bounds, Scale } from '@dxos/gem-x';

import { Element, ElementDataType } from '../model';
import { D3Callable } from '../types';

/**
 * Graphical element.
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element#graphics_elements
 */
export abstract class BaseElement<T extends ElementDataType> {
  private _selected = false;

  constructor (
    private _scale: Scale,
    private _element: Element<T>,
    private _onSelect?: (element: Element<T>) => void,
    private _onUpdate?: (element: Element<T>) => void
  ) {}

  get scale () {
    return this._scale;
  }

  get element () {
    return this._element;
  }

  get selected () {
    return this._selected;
  }

  toString () {
    return `Element(${this._element.id})`;
  }

  setSelected (selected: boolean) {
    this._selected = selected;
  }

  onSelect () {
    this._onSelect?.(this.element);
  }

  onUpdate () {
    this._onUpdate?.(this.element);
  }

  abstract createBounds (): Bounds;

  abstract updateBounds (bounds: Bounds, constrain?: boolean, center?: boolean, commit?: boolean);

  abstract drag (): D3Callable;

  abstract draw (): D3Callable;
}
