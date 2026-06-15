//
// Copyright 2024 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import { type MutableRefObject, type RefObject } from 'react';

export type ColumnSettingsMode = { type: 'create' } | { type: 'edit'; fieldId: string };

export type ModalState =
  | { type: 'row'; rowIndex: number }
  | { type: 'column'; fieldId: string }
  | { type: 'refPanel'; targetId: string; typename: string }
  | { type: 'columnSettings'; mode: ColumnSettingsMode }
  | { type: 'closed' };

export class ModalController {
  private readonly _registry: Registry.Registry;
  private readonly _state: Atom.Writable<ModalState>;
  private readonly _triggerRef: MutableRefObject<HTMLElement> = { current: null as unknown as HTMLElement };

  constructor(registry: Registry.Registry) {
    this._registry = registry;
    this._state = Atom.make<ModalState>({ type: 'closed' });
  }

  public get state(): Atom.Atom<ModalState> {
    return this._state;
  }

  public get stateValue(): ModalState {
    return this._registry.get(this._state);
  }

  public get trigger() {
    return this._triggerRef as RefObject<HTMLButtonElement>;
  }

  public setTrigger = (trigger: HTMLElement) => {
    this._triggerRef.current = trigger;
  };

  public showRowMenu = (rowIndex: number) => {
    this._registry.set(this._state, { type: 'row', rowIndex });
  };

  public showColumnMenu = (fieldId: string) => {
    this._registry.set(this._state, { type: 'column', fieldId });
  };

  public showColumnCreator = () => {
    this._registry.set(this._state, { type: 'columnSettings', mode: { type: 'create' } });
  };

  public showReferencePanel = (targetId: string, schemaId: string) => {
    this._registry.set(this._state, { type: 'refPanel', targetId, typename: schemaId });
  };

  public openColumnSettings = () => {
    const currentState = this._registry.get(this._state);
    if (currentState.type === 'column') {
      const fieldId = currentState.fieldId;
      // Queue next render to let the column action modal close completely.
      requestAnimationFrame(() => {
        this._registry.set(this._state, {
          type: 'columnSettings',
          mode: { type: 'edit', fieldId },
        });
      });
    }
  };

  public close = () => {
    this._registry.set(this._state, { type: 'closed' });
  };
}
