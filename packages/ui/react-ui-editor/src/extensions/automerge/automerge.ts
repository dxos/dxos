//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { invertedEffects } from '@codemirror/commands';
import { StateField, type Extension, type StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { next as A, type Prop } from '@dxos/automerge/automerge';

import { cursorConverter } from './cursor';
import { updateHeadsEffect, type IDocHandle, isReconcile, type State } from './defs';
import { PatchSemaphore } from './semaphore';
import { Cursor } from '../cursor';

export type AutomergeOptions = {
  handle: IDocHandle;
  path: Prop[];
};

export const automerge = ({ handle, path }: AutomergeOptions): Extension => {
  const syncState = StateField.define<State>({
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
        if (effect.is(updateHeadsEffect)) {
          result.lastHeads = effect.value.newHeads;
          clearUnreconciled = true;
        }
      }

      if (clearUnreconciled) {
        result.unreconciledTransactions = [];
      } else {
        if (!isReconcile(tr)) {
          result.unreconciledTransactions.push(tr);
        }
      }

      return result;
    },
  });

  const semaphore = new PatchSemaphore(handle, syncState);

  return [
    Cursor.converter.of(cursorConverter(handle, path)),
    syncState,

    // Reconcile external updates.
    ViewPlugin.fromClass(
      class {
        constructor(private readonly _view: EditorView) {
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
        semaphore.reconcile(view);
      }
    }),

    // TODO(burdon): Record undo transactions.
    //  See https://github.com/yjs/y-codemirror.next/tree/main
    // https://codemirror.net/examples/inverted-effect
    invertedEffects.of((tr) => {
      // Each change results it three transactions: insert, delete, insert.
      const effects: StateEffect<any>[] = [];
      if (!tr.changes.empty) {
        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          // effects.push(effectType.of({});
        });
      }

      return effects;
    }),
  ];
};
