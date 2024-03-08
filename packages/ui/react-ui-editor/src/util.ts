//
// Copyright 2024 DXOS.org
//

import type { Transaction } from '@codemirror/state';

import { log } from '@dxos/log';

/**
 * CodeMirror callbacks swallow errors so wrap handlers.
 */
// TODO(burdon): EditorView.exceptionSink should catch errors.
export const callbackWrapper = <T extends Function>(fn: T): T =>
  ((...args: any[]) => {
    try {
      return fn(...args);
    } catch (err) {
      log.catch(err);
    }
  }) as unknown as T;

export const logChanges = (trs: readonly Transaction[]) => {
  const changes = trs
    .flatMap((tr) => {
      if (tr.changes.empty) {
        return undefined;
      }

      const changes: any[] = [];
      tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) =>
        changes.push(JSON.stringify({ fromA, toA, fromB, toB, inserted: inserted.toString() })),
      );

      return changes;
    })
    .filter(Boolean);

  if (changes.length) {
    log.info('changes', { changes });
  }
};
