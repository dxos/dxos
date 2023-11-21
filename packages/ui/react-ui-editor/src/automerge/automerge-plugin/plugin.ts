//
// Copyright 2023 DXOS.org
//

import * as automerge from '@automerge/automerge';
import { type Doc, type Heads, type Prop } from '@automerge/automerge';
import {
  Annotation,
  type EditorState,
  type Extension,
  Facet,
  StateEffect,
  StateField,
  type Transaction,
  type TransactionSpec,
} from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { PatchSemaphore } from './PatchSemaphore';
import { type Peer } from '../demo';

export type Value = {
  lastHeads: Heads;
  path: Prop[];
  unreconciledTransactions: Transaction[];
};

type UpdateHeads = {
  newHeads: Heads;
};

export const effectType = StateEffect.define<UpdateHeads>({});

export const updateHeads = (newHeads: Heads): StateEffect<UpdateHeads> => effectType.of({ newHeads });

export const getLastHeads = (state: EditorState, field: Field): Heads => state.field(field).lastHeads;

export const getPath = (state: EditorState, field: Field): Prop[] => state.field(field).path;

export type Field = StateField<Value>;

const semaphoreFacet = Facet.define<PatchSemaphore, PatchSemaphore>({
  combine: (values) => values.at(-1)!, // Take last.
});

export const plugin = <T>(doc: Doc<T>, path: Prop[]): Extension => {
  const stateField: StateField<Value> = StateField.define({
    create: () => ({
      lastHeads: automerge.getHeads(doc),
      unreconciledTransactions: [],
      path: path.slice(),
    }),
    update: (value: Value, tr: Transaction) => {
      const result: Value = {
        lastHeads: value.lastHeads,
        unreconciledTransactions: value.unreconciledTransactions.slice(),
        path: path.slice(),
      };
      let clearUnreconciled = false;
      for (const effect of tr.effects) {
        if (effect.is(effectType)) {
          result.lastHeads = effect.value.newHeads;
          clearUnreconciled = true;
        }
      }
      if (clearUnreconciled) {
        result.unreconciledTransactions = [];
      } else {
        if (!isReconcileTx(tr)) {
          result.unreconciledTransactions.push(tr);
        }
      }
      return result;
    },
  });
  const semaphore = new PatchSemaphore(stateField);

  return [stateField, semaphoreFacet.of(semaphore)];
};

export const reconcileAnnotationType = Annotation.define<unknown>();

export const isReconcileTx = (tr: Transaction): boolean => !!tr.annotation(reconcileAnnotationType);

export const makeReconcile = (tr: TransactionSpec) => {
  if (tr.annotations != null) {
    if (tr.annotations instanceof Array) {
      tr.annotations = [...tr.annotations, reconcileAnnotationType.of({})];
    } else {
      tr.annotations = [tr.annotations, reconcileAnnotationType.of({})];
    }
  } else {
    tr.annotations = [reconcileAnnotationType.of({})];
  }
  // return {
  // ...tr,
  // annotations: reconcileAnnotationType.of({})
  // }
};

export const reconcile = (handle: Peer, view: EditorView) => {
  view.state.facet(semaphoreFacet).reconcile(handle, view);
};
