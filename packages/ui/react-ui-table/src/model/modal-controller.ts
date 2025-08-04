//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';
import { type MutableRefObject, type RefObject } from 'react';

import { type Live } from '@dxos/live-object';
import { log } from '@dxos/log';

export type ColumnSettingsMode = { type: 'create' } | { type: 'edit'; fieldId: string };

export type ModalState =
  | { type: 'row'; rowIndex: number }
  | { type: 'column'; fieldId: string }
  | { type: 'refPanel'; targetId: string; typename: string }
  | {
      type: 'createRefPanel';
      typename: string;
      initialValues?: Record<string, string>;
      onCreate?: (obj: Live<any>) => void;
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

  public setTrigger = (trigger: HTMLElement) => {
    this._triggerRef.current = trigger;
  };

  public showRowMenu = (rowIndex: number) => {
    this._state.value = { type: 'row', rowIndex };
  };

  public showColumnMenu = (fieldId: string) => {
    this._state.value = { type: 'column', fieldId };
  };

  public showColumnCreator = () => {
    this._state.value = { type: 'columnSettings', mode: { type: 'create' } };
  };

  public showReferencePanel = (targetId: string, schemaId: string) => {
    this._state.value = { type: 'refPanel', targetId, typename: schemaId };
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
    onCreate?: (obj: Live<any>) => void,
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
