//
// Copyright 2022 DXOS.org
//

import { ElementData, ElementId } from '../model';
import { Control, ControlContext, ControlGetter, SelectionModel } from './control';
import { createControl } from './factory';

/**
 * Cache and factory for controls.
 */
export class ControlManager implements ControlGetter {
  private _controls: Control<any>[] = [];

  constructor (
    private readonly _context: ControlContext,
    private readonly _onRepaint?: () => void,
    private readonly _onSelect?: (element: ElementData<any>, edit?: boolean) => void,
    private readonly _onUpdate?: (element: ElementData<any>, commit?: boolean) => void
  ) {
  }

  toString () {
    return `ControlManager(${this._controls.length})`;
  }

  get elements (): Control<any>[] {
    return this._controls;
  }

  clear () {
    this._controls = [];
  }

  getControl (id: ElementId) {
    return this._controls.find(({ element }) => element.id === id);
  }

  updateElements (elements: ElementData<any>[], selection?: SelectionModel) {
    this._controls = elements.map(element => {
      const control = this.getControl(element.id) ??
        createControl(element.type, this._context, this, element, this._onRepaint, this._onSelect, this._onUpdate);

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
