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
    private readonly _scale: Scale,
    private readonly _onSelect?: (element: Element<any>) => void,
    private readonly _onUpdate?: (element: Element<any>) => void
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

  update (elements: Element<any>[], selected?: Element<any>) {
    this._elements = elements.map(element => {
      const base = this.getElement(element.id) ?? this._createElement(element);
      base.setSelected(element.id === selected?.id);
      return base;
    });
  }

  _createElement (element: Element<any>) {
    switch (element.type) {
      case 'ellipse': {
        return new EllipseElement(this._scale, element, this._onSelect, this._onUpdate);
      }

      default: {
        throw new Error(`Invalid type: ${element.type}`);
      }
    }
  }
}
