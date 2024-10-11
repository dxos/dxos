//
// Copyright 2024 DXOS.org
//

import type { Transaction } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

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

/**
 * Log all changes before dispatching them to the view.
 * https://codemirror.net/docs/ref/#view.EditorView.dispatch
 */
export const debugDispatcher = (trs: readonly Transaction[], view: EditorView) => {
  logChanges(trs);
  view.update(trs);
};

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
