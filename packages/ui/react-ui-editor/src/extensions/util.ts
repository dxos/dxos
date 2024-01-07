//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';

/**
 * CodeMirror callbacks swallow errors so wrap handlers.
 */
// TODO(burdon): Figure out how to systematize this.
export const callbackWrapper = <T extends Function>(fn: T): T =>
  ((...args: any[]) => {
    try {
      return fn(...args);
    } catch (error) {
      log.catch(error);
    }
  }) as unknown as T;
