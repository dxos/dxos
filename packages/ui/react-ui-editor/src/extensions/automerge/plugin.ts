//
// Copyright 2023 DXOS.org
// Ref: https://github.com/automerge/automerge-codemirror
//

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
import { ViewPlugin, type EditorView, type PluginValue, type ViewUpdate } from '@codemirror/view';

import { next as A } from '@dxos/automerge/automerge';
import { type Heads, type Prop } from '@dxos/automerge/automerge';

import { cursorConverter } from './cursor-converter';
import { type IDocHandle } from './handle';
import { PatchSemaphore } from './semaphore';
import { CursorConverter } from '../cursor-converter';

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

export const getLastHeads = (state: EditorState, field: StateField<Value>): Heads => state.field(field).lastHeads;

export const getPath = (state: EditorState, field: StateField<Value>): Prop[] => state.field(field).path;

const semaphoreFacet = Facet.define<PatchSemaphore, PatchSemaphore>({
  combine: (values) => values.at(-1)!, // Take last.
});

export const automerge = (handle: IDocHandle, path: Prop[]): Extension => {
  // TODO(burdon): Rename.
  const stateField: StateField<Value> = StateField.define({
    create: () => ({
      lastHeads: A.getHeads(handle.docSync()!),
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

  const viewPlugin = ViewPlugin.fromClass(
    class AutomergeCodemirrorViewPlugin implements PluginValue {
      constructor(private readonly _view: EditorView) {
        handle.addListener('change', this._handleChange);
      }

      update(update: ViewUpdate) {
        if (update.transactions.length > 0 && update.transactions.some((tr) => !isReconcileTx(tr))) {
          // TODO(burdon): This is a hack to ensure that the view is updated after the transaction is applied.
          queueMicrotask(() => {
            this._view.state.facet(semaphoreFacet).reconcile(handle, this._view);
          });
        }
      }

      destroy() {
        handle.addListener('change', this._handleChange);
      }

      private _handleChange = () => {
        this._view.state.facet(semaphoreFacet).reconcile(handle, this._view);
      };
    },
  );

  return {
    extension: [
      stateField,
      semaphoreFacet.of(semaphore),
      viewPlugin,
      CursorConverter.of(cursorConverter(handle, path)),
    ],
  };
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
