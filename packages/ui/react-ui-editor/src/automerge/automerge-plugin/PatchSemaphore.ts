import { next as automerge, equals } from "@automerge/automerge"
import { DocHandle } from "@automerge/automerge-repo"
import { EditorView } from "@codemirror/view"
import codeMirrorToAm from "./codeMirrorToAm"
import amToCodemirror from "./amToCodemirror"
import {
  Field,
  isReconcileTx,
  getPath,
  reconcileAnnotationType,
  updateHeads,
  getLastHeads,
} from "./plugin"

type Doc<T> = automerge.Doc<T>
type Heads = automerge.Heads

type ChangeFn = (
  atHeads: Heads,
  change: (doc: Doc<unknown>) => void
) => Heads | undefined

export class PatchSemaphore {
  _field: Field
  _inReconcile = false
  _queue: Array<ChangeFn> = []

  constructor(field: Field) {
    this._field = field
  }

  reconcile = (handle: DocHandle<unknown>, view: EditorView) => {
    if (this._inReconcile) {
      return
    } else {
      this._inReconcile = true

      const path = getPath(view.state, this._field)
      const oldHeads = getLastHeads(view.state, this._field)
      let selection = view.state.selection

      const transactions = view.state
        .field(this._field)
        .unreconciledTransactions.filter(tx => !isReconcileTx(tx))

      // First undo all the unreconciled transactions
      const toInvert = transactions.slice().reverse()
      for (const tx of toInvert) {
        const inverted = tx.changes.invert(tx.startState.doc)
        selection = selection.map(inverted)
        view.dispatch({
          changes: inverted,
          annotations: reconcileAnnotationType.of(true),
        })
      }

      // now apply the unreconciled transactions to the document
      let newHeads = codeMirrorToAm(
        this._field,
        handle.changeAt.bind(handle),
        transactions,
        view.state
      )

      // NOTE: null and undefined each come from automerge and repo respectively
      if (newHeads === null || newHeads === undefined) {
        // TODO: @alexjg this is the call that's resetting the editor state on click
        newHeads = automerge.getHeads(handle.docSync())
      }

      // now get the diff between the updated state of the document and the heads
      // and apply that to the codemirror doc
      const diff = automerge.equals(oldHeads, newHeads) ? [] : automerge.diff(handle.docSync(), oldHeads, newHeads)
      amToCodemirror(view, selection, path, diff)

      view.dispatch({
        effects: updateHeads(newHeads),
        annotations: reconcileAnnotationType.of({}),
      })

      this._inReconcile = false
    }
  }
}
