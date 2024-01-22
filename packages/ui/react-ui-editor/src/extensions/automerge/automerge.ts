//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { StateField, type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { type Prop, next as A } from '@dxos/automerge/automerge';
import { invariant } from '@dxos/invariant';

import { cursorConverter } from './cursor';
import { effectType, type IDocHandle, isReconcileTx, type State } from './defs';
import { PatchSemaphore } from './semaphore';
import { Cursor } from '../cursor';

export type AutomergeOptions = {
  handle: IDocHandle;
  path: Prop[];
};

export const automerge = ({ handle, path }: AutomergeOptions): Extension => {
  const state = StateField.define<State>({
    create: () => ({
      path: path.slice(),
      lastHeads: A.getHeads(handle.docSync()!),
      unreconciledTransactions: [],
    }),

    update: (value, tr) => {
      const result: State = {
        path: path.slice(),
        lastHeads: value.lastHeads,
        unreconciledTransactions: value.unreconciledTransactions.slice(),
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

  const semaphore = new PatchSemaphore(handle, state);

  return [
    Cursor.converter.of(cursorConverter(handle, path)),
    // Reconcile external updates.
    ViewPlugin.fromClass(
      class {
        constructor(private readonly _view: EditorView) {
          invariant(this._view);
          handle.addListener('change', this._handleChange.bind(this));
        }

        destroy() {
          handle.removeListener('change', this._handleChange.bind(this));
        }

        _handleChange() {
          semaphore.reconcile(this._view);
        }
      },
    ),
    // Reconcile local updates.
    EditorView.updateListener.of(({ view, changes }) => {
      if (!changes.empty) {
        // TODO(burdon): Loses cursor position if auto closing brackets. Call explicitly?
        semaphore.reconcile(view);
      }
    }),
    state,
  ];
};
