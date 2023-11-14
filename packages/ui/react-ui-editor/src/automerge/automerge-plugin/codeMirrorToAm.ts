import { next as am } from "@automerge/automerge"
import { Heads } from "@automerge/automerge"
import { EditorState, Text, Transaction } from "@codemirror/state"
import { type Field } from "./plugin"
import { Peer } from "../demo"

export default function (
  field: Field,
  handle: Peer,
  transactions: Transaction[],
  state: EditorState
): Heads | undefined {
  const { lastHeads, path } = state.field(field)

  // We don't want to call `automerge.updateAt` if there are no changes.
  // Otherwise later on `automerge.diff` will return empty patches that result in a no-op but still mess up the selection.
  let hasChanges = false;
  for (const tr of transactions) {
    if (tr.changes.length) {
      tr.changes.iterChanges(() => {
        hasChanges = true;
      });
    }
  }

  if(!hasChanges) {
    return undefined;
  }

  const newHeads = handle.changeAt(lastHeads, (doc: am.Doc<unknown>) => {
    for (const tr of transactions) {
      tr.changes.iterChanges(
        (
          fromA: number,
          toA: number,
          _fromB: number,
          _toB: number,
          inserted: Text
        ) => {
          am.splice(doc, path, fromA, toA - fromA, inserted.toString())
        }
      )
    }
  })
  return newHeads ?? undefined
}
