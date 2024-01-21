//
// Copyright 2024 DXOS.org
//

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
