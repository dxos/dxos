//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { StateField, type Extension, type Transaction } from '@codemirror/state';
import { ViewPlugin, type EditorView, type PluginValue, type ViewUpdate } from '@codemirror/view';

import { next as A } from '@dxos/automerge/automerge';
import { type Prop } from '@dxos/automerge/automerge';

import { cursorConverter } from './cursor';
import { effectType, type IDocHandle, isReconcileTx, semaphoreFacet, type Value } from './defs';
import { PatchSemaphore } from './semaphore';
import { Cursor } from '../cursor';

export type AutomergeOptions = {
  handle: IDocHandle;
  path: Prop[];
};

export const automerge = ({ handle, path }: AutomergeOptions): Extension => {
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

  const semaphore = new PatchSemaphore(handle, stateField);

  const viewPlugin = ViewPlugin.fromClass(
    class AutomergeViewPlugin implements PluginValue {
      constructor(private readonly _view: EditorView) {
        handle.addListener('change', this._handleChange);
      }

      update(update: ViewUpdate) {
        if (update.transactions.length > 0 && update.transactions.some((tr) => !isReconcileTx(tr))) {
          queueMicrotask(() => {
            this._view.state.facet(semaphoreFacet).reconcile(this._view);
          });
        }
      }

      destroy() {
        handle.addListener('change', this._handleChange);
      }

      private _handleChange = () => {
        this._view.state.facet(semaphoreFacet).reconcile(this._view);
      };
    },
  );

  return {
    extension: [
      Cursor.converter.of(cursorConverter(handle, path)),
      semaphoreFacet.of(semaphore),
      stateField,
      viewPlugin,
    ],
  };
};
