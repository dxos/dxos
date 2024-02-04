//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { type StateField } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { next as A } from '@dxos/automerge/automerge';
import { log } from '@dxos/log';
import { getDebugName } from '@dxos/util';

import {
  getLastHeads,
  getPath,
  isReconcile,
  type IDocHandle,
  type State,
  reconcileAnnotation,
  updateHeads,
} from './defs';
import { updateAutomerge } from './update-automerge';
import { updateCodeMirror } from './update-codemirror';

/**
 * Implements three-way merge (on each mutation).
 */
export class PatchSemaphore {
  private _inReconcile = false;

  // prettier-ignore
  constructor(
    private readonly _handle: IDocHandle,
    private readonly _state: StateField<State>
  ) {}

  // TODO(burdon): Split into two methods.
  reconcile(view: EditorView, cm: boolean) {
    if (this._inReconcile) {
      log.info('already in reconcile');
      return;
    }

    this._inReconcile = true;
    this.doReconcile(view, cm);
    this._inReconcile = false;
  }

  private doReconcile(view: EditorView, cm: boolean) {
    const path = getPath(view.state, this._state);

    // Get the heads before the unreconciled transactions are applied.
    const oldHeads = getLastHeads(view.state, this._state);
    const selection = view.state.selection;
    const transactions = view.state.field(this._state).unreconciledTransactions.filter((tx) => !isReconcile(tx));
    console.log(':::', getDebugName(view.state), cm, transactions.length);

    // First undo all the unreconciled transactions.
    // const toInvert = transactions.slice().reverse();
    // for (const tr of toInvert) {
    // const inverted = tr.changes.invert(tr.startState.doc);
    // selection = selection.map(inverted);
    // view.dispatch({
    //   changes: inverted,
    //   annotations: reconcileAnnotation.of(true),
    // });
    // }

    // Apply the unreconciled transactions to the document.
    // NOTE: null and undefined each come from automerge and repo respectively.
    let newHeads = updateAutomerge(this._state, this._handle, transactions, view.state);
    if (newHeads === null || newHeads === undefined) {
      console.log('??', transactions.length, newHeads);
      // TODO(alexjg): this is the call that's resetting the editor state on click.
      newHeads = A.getHeads(this._handle.docSync()!);
    }

    // Now get the diff between the updated state of the document and the heads and apply that to the codemirror doc.
    const diff = A.equals(oldHeads, newHeads) ? [] : A.diff(this._handle.docSync()!, oldHeads, newHeads);
    if (!cm) {
      updateCodeMirror(view, selection, path, diff);
    }

    // Update automerge state.
    view.dispatch({
      effects: updateHeads(newHeads),
      annotations: reconcileAnnotation.of(false),
    });
  }
}
