//
// Copyright 2022 DXOS.org
//

import { Scale } from '@dxos/gem-x';

import { Element, ElementId } from '../model';
import { BaseElement } from './base';
import { createElement } from './factory';

/**
 * Cache of graphical element wrappers.
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

  get elements (): BaseElement<any>[] {
    return this._elements;
  }

  clear () {
    this._elements = [];
  }

  getElement (id: ElementId) {
    return this._elements.find(({ element }) => element.id === id);
  }

  updateElements (elements: Element<any>[], selected?: Element<any>) {
    this._elements = elements.map(element => {
      const base = this.getElement(element.id) ??
        createElement(this._scale, element.type, element, this._onSelect, this._onUpdate);

      base.setSelected(element.id === selected?.id);
      return base;
    });
  }
}
