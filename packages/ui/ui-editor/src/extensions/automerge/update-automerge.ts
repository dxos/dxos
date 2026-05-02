//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { next as A, type Heads } from '@automerge/automerge';
import { decodeHeads, encodeHeads } from '@automerge/automerge-repo';
import { type EditorState, type StateField, type Text, type Transaction } from '@codemirror/state';

import { type IDocHandle } from '@dxos/echo-db';

import { type State } from './defs';

export const updateAutomerge = (
  field: StateField<State>,
  handle: IDocHandle,
  transactions: Transaction[],
  state: EditorState, // TODO(burdon): Just pass in the state field value?
): Heads | undefined => {
  const { lastHeads, path } = state.field(field);

  // We don't want to call `automerge.updateAt` if there are no changes.
  // Otherwise, later on `automerge.diff` will return empty patches that result in a no-op but still mess up the selection.
  let hasChanges = false;
  for (const tr of transactions) {
    tr.changes.iterChanges(() => {
      hasChanges = true;
    });
  }

  if (!hasChanges) {
    return undefined;
  }

  // `DocHandle.changeAt` expects bs58check-encoded `UrlHeads`, but our state stores raw
  // `Heads` (hex) from `A.getHeads()`. Encode on the way in, decode on the way out.
  const encodedNewHeads = handle.changeAt(encodeHeads(lastHeads), (doc: A.Doc<unknown>) => {
    const invertedTransactions: { from: number; del: number; insert: Text }[] = [];
    for (const tr of transactions) {
      tr.changes.iterChanges((fromA, toA, _fromB, _toB, insert) => {
        invertedTransactions.push({ from: fromA, del: toA - fromA, insert });
      });
    }

    // TODO(burdon): Hack to apply in reverse order to properly apply range.
    invertedTransactions.reverse().forEach(({ from, del, insert }) => {
      A.splice(doc, path.slice(), from, del, insert.toString());
    });
  });

  return encodedNewHeads ? decodeHeads(encodedNewHeads) : undefined;
};
