//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';
import { type RefObject, type MouseEvent, type MutableRefObject } from 'react';

import { tableButtons } from '../util';

export type ColumnSettingsMode = { type: 'create' } | { type: 'edit'; fieldId: string };

export type ModalState =
  | { type: 'row'; rowIndex: number }
  | { type: 'column'; fieldId: string }
  | { type: 'refPanel'; targetId: string }
  | { type: 'columnSettings'; mode: ColumnSettingsMode }
  | { type: 'closed' };

export class ModalController {
  private readonly _state = signal<ModalState>({ type: 'closed' });
  private readonly _triggerRef: MutableRefObject<HTMLElement> = { current: null as unknown as HTMLElement };

  public get state() {
    return this._state;
  }

  public get trigger() {
    return this._triggerRef as RefObject<HTMLButtonElement>;
  }

  public handleClick = (event: MouseEvent): boolean => {
    const target = event.target as HTMLElement;

    // TODO(thure): why not just get the closest value of a recognized attribute and `switch` on that? Repeated querying
    //  is more error-prone and less legible, I’d think.

    const rowButton = target.closest(`button[${tableButtons.rowMenu.attr}]`);
    if (rowButton) {
      this._triggerRef.current = rowButton as HTMLElement;
      this._state.value = {
        type: 'row',
        rowIndex: Number(rowButton.getAttribute(tableButtons.rowMenu.attr)),
      };
      return true;
    }

    const columnButton = target.closest(`button[${tableButtons.columnSettings.attr}]`);
    if (columnButton) {
      const fieldId = columnButton.getAttribute(tableButtons.columnSettings.attr)!;
      this._triggerRef.current = columnButton as HTMLElement;
      this._state.value = {
        type: 'column',
        fieldId,
      };
      return true;
    }

    const addColumnButton = target.closest(`button[${tableButtons.addColumn.attr}]`);
    if (addColumnButton) {
      this._triggerRef.current = addColumnButton as HTMLElement;
      this._state.value = {
        type: 'columnSettings',
        mode: { type: 'create' },
      };
      return true;
    }

    const refButton = target.closest(`button[${tableButtons.referencedCell.attr}]`);
    if (refButton) {
      this._triggerRef.current = refButton as HTMLElement;
      this._state.value = {
        type: 'refPanel',
        targetId: refButton.getAttribute(tableButtons.referencedCell.attr)!,
      };
    }

    return false;
  };

  public openColumnSettings = () => {
    if (this._state.value.type === 'column') {
      const fieldId = this._state.value.fieldId;
      // Queue next render to let the column action modal close completely.
      requestAnimationFrame(() => {
        this._state.value = {
          type: 'columnSettings',
          mode: { type: 'edit', fieldId },
        };
      });
    }
  };

  public close = () => {
    this._state.value = { type: 'closed' };
  };
}
