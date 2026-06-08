//
// Copyright 2026 DXOS.org
//

import { type LogConfig, type LogEntry, type LogProcessor, shouldLog } from '../context';
import { serializeToJsonl } from '../jsonl';
import { log } from '../log';
import { parseFilter } from '../options';

import { type JsonlFileLogStore } from './jsonl-file-log-store';
import { resolveTestLogFilter } from './paths';

/**
 * Install a {@link LogProcessor} that writes filtered `@dxos/log` entries to a {@link JsonlFileLogStore}.
 *
 * @returns Disposer that removes the processor from the global log runtime.
 */
export const installNodeLogProcessor = (
  store: JsonlFileLogStore,
  filterExpr: string = resolveTestLogFilter(),
): (() => void) => {
  const filters = parseFilter(filterExpr);
  const processor: LogProcessor = (_config: LogConfig, entry: LogEntry) => {
    if (!shouldLog(entry, filters)) {
      return;
    }
    const line = serializeToJsonl(entry);
    if (line === undefined) {
      return;
    }
    store.pushLine(line);
  };
  return log.addProcessor(processor);
};
