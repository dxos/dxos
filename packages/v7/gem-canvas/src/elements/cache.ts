//
// Copyright 2022 DXOS.org
//

import { Scale } from '@dxos/gem-x';

import { Element, ElementId } from '../model';
import { BaseElement } from './base';
import { EllipseElement } from './types';

/**
 * Cache of graphical element objects.
 */
export class ElementCache {
  private _elements: BaseElement<any>[] = [];

  constructor (
    private readonly _scale: Scale
  ) {}

  toString () {
    return `ElementCache(${this._elements.length})`;
  }

  get elements () {
    return this._elements;
  }

  clear () {
    this._elements = [];
  }

  getElement (id: ElementId) {
    return this._elements.find(({ element }) => element.id === id);
  }

  update (elements: Element<any>[]) {
    this._elements = elements.map(element => {
      return this.getElement(element.id) ?? this._createElement(element);
    });
  }

  _createElement (element: Element<any>) {
    switch (element.type) {
      case 'ellipse': {
        return new EllipseElement(this._scale, element);
      }

      default: {
        throw new Error(`Invalid type: ${element.type}`);
      }
    }
  }
}
