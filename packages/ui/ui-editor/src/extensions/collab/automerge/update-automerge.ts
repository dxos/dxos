//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { next as A, type Heads } from '@automerge/automerge';
import { ChangeSet, type EditorState, type StateField, type Text, type Transaction } from '@codemirror/state';

import { Doc } from '@dxos/echo-doc';

import { type State } from './defs.ts';

/**
 * Applies consecutive CodeMirror transactions to the Automerge document as one change (via `changeAt`
 * from `baseHeads`, the heads the first transaction started from) and returns the new heads, or
 * undefined when there are no changes.
 */
export const updateAutomerge = (
  field: StateField<State>,
  handle: Doc.Handle,
  transactions: Transaction[],
  state: EditorState, // TODO(burdon): Just pass in the state field value?
  baseHeads: Heads = state.field(field).lastHeads,
): Heads | undefined => {
  const { path } = state.field(field);
  if (transactions.length === 0) {
    return undefined;
  }

  // Composed, the changes are all relative to the document the first transaction started from.
  let changes = ChangeSet.empty(transactions[0].startState.doc.length);
  for (const tr of transactions) {
    changes = changes.compose(tr.changes);
  }

  // We don't want to call `automerge.updateAt` if there are no changes.
  // Otherwise, later on `automerge.diff` will return empty patches that result in a no-op but still mess up the selection.
  if (changes.empty) {
    return undefined;
  }

  const newHeads = handle.changeAt(baseHeads, (doc: A.Doc<unknown>) => {
    const edits: { from: number; del: number; insert: Text }[] = [];
    changes.iterChanges((fromA, toA, _fromB, _toB, insert) => {
      edits.push({ from: fromA, del: toA - fromA, insert });
    });

    // Last to first, so each splice leaves the earlier offsets valid.
    edits.reverse().forEach(({ from, del, insert }) => {
      A.splice(doc, path.slice(), from, del, insert.toString());
    });
  });

  return newHeads ?? undefined;
};
