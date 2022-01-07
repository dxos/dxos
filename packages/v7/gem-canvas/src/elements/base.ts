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
  constructor (
    private _scale: Scale,
    private _element: Element<T>
  ) {}

  get scale () {
    return this._scale;
  }

  get element () {
    return this._element;
  }

  abstract createBounds (scale: Scale): Bounds;

  abstract drag (): D3Callable;

  abstract draw (): D3Callable;
}
