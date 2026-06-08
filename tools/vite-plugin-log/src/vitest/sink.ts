//
// Copyright 2026 DXOS.org
//

import { JsonlFileLogStore } from './jsonl-file-log-store';
import { installNodeLogProcessor } from './node-log-processor';
import { isTestLogFileEnabled, resolveTestLogFilePath } from './paths';

let sharedStore: JsonlFileLogStore | undefined;
let removeProcessor: (() => void) | undefined;

/**
 * Lazily create the per-worker file log sink and wire `@dxos/log` into it.
 */
export const ensureTestLogSink = (): JsonlFileLogStore | undefined => {
  if (!isTestLogFileEnabled()) {
    return undefined;
  }
  sharedStore ??= new JsonlFileLogStore({ path: resolveTestLogFilePath() });
  removeProcessor ??= installNodeLogProcessor(sharedStore);
  return sharedStore;
};

/**
 * Returns the active sink for this worker, if any.
 */
export const getTestLogSink = (): JsonlFileLogStore | undefined => sharedStore;

/**
 * Flush and tear down the worker sink.
 */
export const closeTestLogSink = (): void => {
  sharedStore?.close();
  sharedStore = undefined;
  removeProcessor?.();
  removeProcessor = undefined;
};
