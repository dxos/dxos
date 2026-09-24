//
// Copyright 2024 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { next as A } from '@automerge/automerge';
import { type Extension, StateField, Transaction } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { Doc } from '@dxos/echo-doc';

import { Cursor } from '../../../util/index.ts';
import { cursorConverter } from './cursor.ts';
import { type State, initialSync, isReconcile, reconcileAnnotation, updateHeadsEffect } from './defs.ts';
import { Syncer, type SyncerOptions } from './sync.ts';

/**
 * CodeMirror extension that two-way syncs the editor with the string the {@link Doc.Accessor} points
 * at, reconciling local edits and remote document mutations via Automerge.
 */
export const automerge = (accessor: Doc.Accessor, options?: SyncerOptions): Extension => {
  const syncState = StateField.define<State>({
    create: () => {
      return {
        path: accessor.path.slice(),
        lastHeads: A.getHeads(accessor.handle.doc()!),
        unreconciledTransactions: [],
      };
    },

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

  const syncer = new Syncer(accessor.handle, syncState, options);

  return [
    Cursor.converter.of(cursorConverter(accessor, () => syncer.flushForRead())),

    // Track heads.
    syncState,

    // Reconcile external updates.
    ViewPlugin.fromClass(
      class {
        private _destroyed = false;

        constructor(private readonly _view: EditorView) {
          syncer.attach(_view);
          accessor.handle.addListener('change', this._handleChange);
          globalThis.addEventListener?.('pagehide', this._handlePageHide);

          // Reconcile on attach: a compartment swap hands this extension a view whose content is the
          // PREVIOUS document's. Deferred by a microtask only to escape the in-progress update cycle;
          // rAF is not reliable for correctness (hidden/throttled frames never fire it), and until
          // this replace runs every write maps view coordinates onto the wrong document.
          queueMicrotask(() => {
            if (this._destroyed) {
              return;
            }
            // Edits made since mount would otherwise be replaced by the document's older content.
            syncer.flush();
            const value = Doc.getValue<string>(accessor);
            const current = this._view.state.doc.toString();
            if (value !== current) {
              this._view.dispatch({
                changes: { from: 0, to: this._view.state.doc.length, insert: value },
                annotations: [initialSync, reconcileAnnotation.of(true)],
              });
            }
          });
        }

        update(update: ViewUpdate) {
          syncer.track(update.state);
        }

        destroy() {
          this._destroyed = true;
          accessor.handle.removeListener('change', this._handleChange);
          globalThis.removeEventListener?.('pagehide', this._handlePageHide);
          syncer.detach();
        }

        readonly _handleChange = () => {
          syncer.reconcile(this._view, false);
        };

        // Edits still waiting for their burst to end would otherwise be lost with the page.
        readonly _handlePageHide = () => {
          syncer.flush();
        };
      },
    ),

    // Reconcile local updates.
    EditorView.updateListener.of(({ view, changes, transactions }) => {
      if (!changes.empty) {
        // Only reconcile if it's not an initial sync (to avoid loops)
        const isInitialSync = transactions.some((tr) => tr.annotation(Transaction.userEvent) === initialSync.value);
        if (!isInitialSync) {
          syncer.reconcile(view, true);
        }
      }
    }),
  ];
};
