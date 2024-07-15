//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { type StateField } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { next as A } from '@dxos/automerge/automerge';
import { type IDocHandle } from '@dxos/react-client/echo';

import { getLastHeads, getPath, isReconcile, reconcileAnnotation, type State, updateHeads } from './defs';
import { updateAutomerge } from './update-automerge';
import { updateCodeMirror } from './update-codemirror';

/**
 * Implements three-way merge (on each mutation).
 */
export class Syncer {
  private _pending = false;

  // prettier-ignore
  constructor(
    private readonly _handle: IDocHandle,
    private readonly _state: StateField<State>
  ) {}

  reconcile(view: EditorView, editor: boolean) {
    // TODO(burdon): Better way to do mutex?
    if (this._pending) {
      return;
    }

    this._pending = true;
    if (editor) {
      this.onEditorChange(view);
    } else {
      this.onAutomergeChange(view);
    }
    this._pending = false;
  }

  onEditorChange(view: EditorView) {
    // Apply the unreconciled transactions to the document.
    const transactions = view.state.field(this._state).unreconciledTransactions.filter((tx) => !isReconcile(tx));
    const newHeads = updateAutomerge(this._state, this._handle, transactions, view.state);

    if (newHeads) {
      view.dispatch({
        effects: updateHeads(newHeads),
        annotations: reconcileAnnotation.of(false),
      });
    }
  }

  onAutomergeChange(view: EditorView) {
    // Get the diff between the updated state of the document and the heads and apply that to the codemirror doc.
    const oldHeads = getLastHeads(view.state, this._state);
    const newHeads = A.getHeads(this._handle.docSync()!);
    const diff = A.equals(oldHeads, newHeads) ? [] : A.diff(this._handle.docSync()!, oldHeads, newHeads);

    const selection = view.state.selection;
    const path = getPath(view.state, this._state);
    updateCodeMirror(view, selection, path, diff);

    // TODO(burdon): Test conflicts?
    // A.getConflicts(this._handle.docSync()!, path[0]);

    view.dispatch({
      effects: updateHeads(newHeads),
      annotations: reconcileAnnotation.of(false),
    });
  }
}
