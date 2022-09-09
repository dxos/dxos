//
// Copyright 2022 DXOS.org
//

import { ElementData, ElementId, Line } from '../model';
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
  ) {}

  toString () {
    return `ControlManager(${this._controls.length})`;
  }

  get controls (): Control<any>[] {
    return this._controls;
  }

  getControl (id: ElementId) {
    return this._controls.find(({ element }) => element.id === id);
  }

  /**
   * Get a list of modified control IDs.
   * @param controlManager
   * @param debug
   */
  getModified (controlManager, debug = false): ElementId[] {
    const modified = new Set<ElementId>(debug ? controlManager.controls.map(control => control.element.id) : undefined);
    if (!debug) {
      controlManager.controls.forEach(control => {
        if (control.modified) {
          modified.add(control.element.id);
        }

        // TODO(burdon): Hack to add dependencies.
        if (control.element.type === 'line') {
          const data: Line = control.data;
          if ((data.source?.id && controlManager.getControl(data.source?.id)?.modified) ||
            (data.target?.id && controlManager.getControl(data.target?.id)?.modified)) {
            modified.add(control.element.id);
          }
        }
      });
    }

    return Array.from(modified);
  }

  /**
   * Update the cache with the provided set of elements.
   * @param elements
   * @param selection
   */
  updateElements (elements: ElementData<any>[], selection?: SelectionModel) {
    const handleUpdate = !this._onUpdate ? undefined : (element, commit) => {
      if (commit) {
        this._onUpdate(element);
      } else {
        this._onRepaint();
      }
    };

    this._controls = elements.map(element => {
      const control = this.getControl(element.id) ??
        createControl(element.type, this._context, this, element, this._onRepaint, this._onSelect, handleUpdate);

      control.update(element);
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
