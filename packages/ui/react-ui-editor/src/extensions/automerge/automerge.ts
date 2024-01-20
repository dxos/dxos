//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { StateField, type Extension } from '@codemirror/state';

import { type Prop, next as A } from '@dxos/automerge/automerge';

import { cursorConverter } from './cursor';
import { effectType, type IDocHandle, isReconcileTx, type Value } from './defs';
import { PatchSemaphore } from './semaphore';
import { Cursor } from '../cursor';
import { syncFacet } from '../sync';

export type AutomergeOptions = {
  handle: IDocHandle;
  path: Prop[];
};

export const automerge = ({ handle, path }: AutomergeOptions): Extension => {
  // TODO(burdon): Rename and comment.
  const stateField = StateField.define<Value>({
    create: () => ({
      path: path.slice(),
      lastHeads: A.getHeads(handle.docSync()!),
      unreconciledTransactions: [],
    }),

    update: (value, tr) => {
      const result: Value = {
        path: path.slice(),
        lastHeads: value.lastHeads,
        unreconciledTransactions: value.unreconciledTransactions.slice(),
      };

      let clearUnreconciled = false;
      for (const effect of tr.effects) {
        if (effect.is(effectType)) {
          result.lastHeads = effect.value.newHeads;
          clearUnreconciled = true;
        }
      }

      if (clearUnreconciled) {
        result.unreconciledTransactions = [];
      } else {
        if (!isReconcileTx(tr)) {
          result.unreconciledTransactions.push(tr);
        }
      }

      return result;
    },
  });

  const semaphore = new PatchSemaphore(handle, stateField);

  return {
    extension: [Cursor.converter.of(cursorConverter(handle, path)), syncFacet.of(semaphore), stateField],
  };
};
