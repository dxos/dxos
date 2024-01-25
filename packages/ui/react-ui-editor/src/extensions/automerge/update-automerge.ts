//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { type EditorState, type StateField, type Transaction } from '@codemirror/state';

import { next as automerge, type Heads } from '@dxos/automerge/automerge';

import { type IDocHandle, type State } from './defs';

export const updateAutomerge = (
  field: StateField<State>,
  handle: IDocHandle,
  transactions: Transaction[],
  state: EditorState, // TODO(burdon): Just pass in the state field value.
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

  const newHeads = handle.changeAt(lastHeads, (doc: automerge.Doc<unknown>) => {
    const t: any[] = [];
    for (const tr of transactions) {
      tr.changes.iterChanges((fromA, toA, _fromB, _toB, insert) => {
        t.push({ fromA, toA, insert });
      });
    }

    // Apply in reverse order to properly apply range.
    t.reverse().forEach(({ fromA, toA, insert }) => {
      automerge.splice(doc, path.slice(), fromA, toA - fromA, insert.toString());
    });
  });

  return newHeads ?? undefined;
};
