//
// Copyright 2022 DXOS.org
//

import { Scale } from '@dxos/gem-x';

import { ElementData, ElementId } from '../model';
import { Control, ElementGetter, SelectionModel } from './control';
import { createControl } from './factory';

/**
 * Cache of graphical element wrappers.
 */
export class ElementCache implements ElementGetter {
  private _elements: Control<any>[] = [];

  constructor (
    private readonly _scale: Scale,
    private readonly _onRepaint?: () => void,
    private readonly _onSelect?: (element: ElementData<any>, edit?: boolean) => void,
    private readonly _onUpdate?: (element: ElementData<any>, commit?: boolean) => void
  ) {}

  toString () {
    return `ElementCache(${this._elements.length})`;
  }

  get elements (): Control<any>[] {
    return this._elements;
  }

  clear () {
    this._elements = [];
  }

  getElement (id: ElementId) {
    return this._elements.find(({ element }) => element.id === id);
  }

  updateElements (elements: ElementData<any>[], selection?: SelectionModel) {
    this._elements = elements.map(element => {
      const control = this.getElement(element.id) ??
        createControl(element.type, this, this._scale, element, this._onRepaint, this._onSelect, this._onUpdate);

      if (control) {
        if (element.id === selection?.element?.id) {
          control.setState(selection.state);
        } else {
          control.setState(undefined);
        }
      }

      return control;
    }).filter(Boolean);
  }
}
