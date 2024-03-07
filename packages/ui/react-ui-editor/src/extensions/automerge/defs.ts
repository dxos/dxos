//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { Annotation, StateEffect, type StateField, type EditorState, type Transaction } from '@codemirror/state';
import get from 'lodash.get';

import { type ChangeFn, type ChangeOptions, type Doc, type Heads, type Prop } from '@dxos/automerge/automerge';

export type State = {
  path: Prop[];
  lastHeads: Heads;
  unreconciledTransactions: Transaction[];
};

export const getPath = (state: EditorState, field: StateField<State>): Prop[] => state.field(field).path;
export const getLastHeads = (state: EditorState, field: StateField<State>): Heads => state.field(field).lastHeads;

export type UpdateHeads = {
  newHeads: Heads;
};

export const updateHeadsEffect = StateEffect.define<UpdateHeads>({});

export const updateHeads = (newHeads: Heads): StateEffect<UpdateHeads> => updateHeadsEffect.of({ newHeads });

export const reconcileAnnotation = Annotation.define<boolean>();

export const isReconcile = (tr: Transaction): boolean => {
  return !!tr.annotation(reconcileAnnotation);
};

// TODO(burdon): Reconcile with echo.
export interface DocAccessor<T = any> {
  handle: IDocHandle<T>;
  get path(): string[]; // TODO(burdon): Getter or prop?
}

// TODO(burdon): Reconcile with echo.
export const DocAccessor = {
  getValue: (accessor: DocAccessor): string => get(accessor.handle, accessor.path),
};

// TODO(burdon): Reconcile with echo.
export interface IDocHandle<T = any> {
  docSync(): Doc<T> | undefined;
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): string[] | undefined;
  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
}
