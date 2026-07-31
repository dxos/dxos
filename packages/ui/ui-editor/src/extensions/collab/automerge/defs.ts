//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { type Heads, type Prop } from '@automerge/automerge';
import { Annotation, type EditorState, StateEffect, type StateField, Transaction } from '@codemirror/state';

/** Marks the transaction that performs the initial editor/document reconciliation. */
export const initialSync = Transaction.userEvent.of('initial.sync');

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
