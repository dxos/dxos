//
// Copyright 2024 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { next as A } from '@automerge/automerge';
import { type Extension, StateField } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { type DocAccessor } from '@dxos/react-client/echo';

import { Cursor } from '../../util';

import { cursorConverter } from './cursor';
import { type State, isReconcile, updateHeadsEffect } from './defs';
import { Syncer } from './sync';

export const automerge = (accessor: DocAccessor): Extension => {
  const syncState = StateField.define<State>({
    create: () => ({
      path: accessor.path.slice(),
      lastHeads: A.getHeads(accessor.handle.doc()!),
      unreconciledTransactions: [],
    }),

    update: (value, tr) => {
      const result: State = {
        path: accessor.path.slice(),
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

  const syncer = new Syncer(accessor.handle, syncState);

  return [
    Cursor.converter.of(cursorConverter(accessor)),

    // Track heads.
    syncState,

    // Reconcile external updates.
    ViewPlugin.fromClass(
      class {
        constructor(private readonly _view: EditorView) {
          accessor.handle.addListener('change', this._handleChange);
        }

        destroy() {
          accessor.handle.removeListener('change', this._handleChange);
        }

        readonly _handleChange = () => {
          syncer.reconcile(this._view, false);
        };
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
