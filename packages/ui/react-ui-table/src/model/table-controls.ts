//
// Copyright 2024 DXOS.org
//

import { type MouseEvent } from 'react';

import { type TableModel } from './';
import { ModalController } from './modal-controller';
import { tableControls } from '../util/table-controls';

export class TableControls {
  public readonly modals = new ModalController();

  constructor(private readonly model: TableModel) {}

  public handleClick = (event: MouseEvent): void => {
    const modalHandledClick = this.modals.handleClick(event);
    if (!modalHandledClick) {
      const target = event.target as HTMLElement;

      const selectionCheckbox = target.closest(
        `input[${tableControls.checkbox.attributes.checkbox}]`,
      ) as HTMLElement | null;

      if (selectionCheckbox) {
        this.handleCheckboxClick(selectionCheckbox);
      }
    }
  };

  private handleCheckboxClick = (checkbox: HTMLElement): void => {
    const isHeader = checkbox.hasAttribute(tableControls.checkbox.attributes.header);

    if (isHeader) {
      this.model.selection.setSelection(this.model.selection.allRowsSeleted.value ? 'none' : 'all');
    } else {
      const rowIndex = Number(checkbox.getAttribute(tableControls.checkbox.attributes.checkbox));
      this.model.selection.toggleSelectionForRowIndex(rowIndex);
    }
  };
}
