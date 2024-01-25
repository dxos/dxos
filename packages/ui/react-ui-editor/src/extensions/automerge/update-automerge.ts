//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { type EditorState, type StateField, type Text, type Transaction } from '@codemirror/state';

import { next as am, type Heads } from '@dxos/automerge/automerge';

import { type IDocHandle, type State } from './defs';

export const updateAutomerge = (
  field: StateField<State>,
  handle: IDocHandle,
  transactions: Transaction[],
  state: EditorState,
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

  const newHeads = handle.changeAt(lastHeads, (doc: am.Doc<unknown>) => {
    for (const tr of transactions) {
      tr.changes.iterChanges((fromA: number, toA: number, _fromB: number, _toB: number, inserted: Text) => {
        am.splice(doc, path, fromA, toA - fromA, inserted.toString());
      });
    }
  });

  return newHeads ?? undefined;
};
