//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { StateField, type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { next as A, type Prop } from '@dxos/automerge/automerge';

import { cursorConverter } from './cursor';
import { updateHeadsEffect, type IDocHandle, isReconcile, type State } from './defs';
import { Syncer } from './sync';
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

  const syncer = new Syncer(handle, syncState);

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
          syncer.reconcile(this._view, false);
        }
      },
    ),

    // Reconcile local updates.
    EditorView.updateListener.of(({ view, changes }) => {
      if (!changes.empty) {
        syncer.reconcile(view, true);
      }
    }),
  ];
};
