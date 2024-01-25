//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { Annotation, StateEffect, type StateField, type EditorState, type Transaction } from '@codemirror/state';

import { type ChangeFn, type ChangeOptions, type Doc, type Heads, type Prop } from '@dxos/automerge/automerge';

// TODO(burdon): Rename.
export type State = {
  path: Prop[];
  lastHeads: Heads;
  unreconciledTransactions: Transaction[];
};

export type UpdateHeads = {
  newHeads: Heads;
};

export const effectType = StateEffect.define<UpdateHeads>({});

export const reconcileAnnotationType = Annotation.define<unknown>();

export const getPath = (state: EditorState, field: StateField<State>): Prop[] => state.field(field).path;

export const getLastHeads = (state: EditorState, field: StateField<State>): Heads => state.field(field).lastHeads;

export const updateHeads = (newHeads: Heads): StateEffect<UpdateHeads> => effectType.of({ newHeads });

export const isReconcileTx = (tr: Transaction): boolean => !!tr.annotation(reconcileAnnotationType);

export type IDocHandle<T = any> = {
  docSync(): Doc<T> | undefined;
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): string[] | undefined;

  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
};
