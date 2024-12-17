//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';
import { type RefObject, type MouseEvent, type MutableRefObject } from 'react';

import { type ReactiveObject } from '@dxos/live-object';
import { log } from '@dxos/log';

import { tableButtons } from '../util';

export type ColumnSettingsMode = { type: 'create' } | { type: 'edit'; fieldId: string };

export type ModalState =
  | { type: 'row'; rowIndex: number }
  | { type: 'column'; fieldId: string }
  | { type: 'refPanel'; targetId: string; typename: string }
  | {
      type: 'createRefPanel';
      typename: string;
      initialValues?: Record<string, string>;
      onCreate?: (obj: ReactiveObject<any>) => void;
    }
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
    const selector = Object.values(tableButtons)
      .map((button) => `button[${button.attr}]`)
      .join(',');

    const matchedElement = (event.target as HTMLElement).closest(selector) as HTMLElement;
    if (!matchedElement) {
      return false;
    }

    const button = Object.values(tableButtons).find((btn) => matchedElement.hasAttribute(btn.attr))!;

    this._triggerRef.current = matchedElement;
    const data = button.getData(matchedElement);

    switch (data.type) {
      case 'rowMenu': {
        this._state.value = { type: 'row', rowIndex: data.rowIndex };
        break;
      }
      case 'columnSettings': {
        this._state.value = { type: 'column', fieldId: data.fieldId };
        break;
      }
      case 'newColumn': {
        this._state.value = { type: 'columnSettings', mode: { type: 'create' } };
        break;
      }
      case 'referencedCell': {
        this._state.value = { type: 'refPanel', targetId: data.targetId, typename: data.schemaId };
        break;
      }
    }

    return true;
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

  public openCreateRef = (
    typename: string,
    anchorCell: Element | null,
    initialValues?: Record<string, string>,
    onCreate?: (obj: ReactiveObject<any>) => void,
  ) => {
    if (anchorCell) {
      this._triggerRef.current = anchorCell as HTMLElement;
      this._state.value = {
        type: 'createRefPanel',
        typename,
        initialValues,
        onCreate,
      };
    } else {
      log.warn('anchor cell not found while creating new ref');
    }
  };

  public close = () => {
    this._state.value = { type: 'closed' };
  };
}
