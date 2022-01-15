//
// Copyright 2022 DXOS.org
//

import { Scale } from '@dxos/gem-x';

import { Element, ElementId } from '../model';
import { BaseElement, ElementGetter, SelectionModel } from './base';
import { createElement } from './factory';

/**
 * Cache of graphical element wrappers.
 */
export class ElementCache implements ElementGetter {
  private _elements: BaseElement<any>[] = [];

  constructor (
    private readonly _scale: Scale,
    private readonly _onRepaint?: () => void,
    private readonly _onSelect?: (element: Element<any>, edit?: boolean) => void,
    private readonly _onUpdate?: (element: Element<any>, commit?: boolean) => void
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

  updateElements (elements: Element<any>[], selection?: SelectionModel) {
    this._elements = elements.map(element => {
      const base = this.getElement(element.id) ??
        createElement(element.type, this, this._scale, element, this._onRepaint, this._onSelect, this._onUpdate);

      if (base) {
        if (element.id === selection?.element?.id) {
          base.setState(selection.state);
        } else {
          base.setState(undefined);
        }
      }

      return base;
    }).filter(Boolean);
  }
}
