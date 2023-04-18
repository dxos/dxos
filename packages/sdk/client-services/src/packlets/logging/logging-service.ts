//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { log, LogEntry as NaturalLogEntry, LogProcessor, shouldLog } from '@dxos/log';
import { LoggingService, LogEntry, QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';

/**
 * Logging service used to spy on logs of the host.
 */
export class LoggingServiceImpl implements LoggingService {
  private readonly _active = new Set<Event<LogEntry>>();

  constructor() {
    log.runtimeConfig.processors.push(this._logProcessor);
  }

  queryLogs(request: QueryLogsRequest): Stream<LogEntry> {
    const logs = new Event<LogEntry>();
    this._active.add(logs);
    return new Stream<LogEntry>(({ ctx, next }) => {
      const handler = (entry: LogEntry) => {
        if (shouldLog(transformLogEntry(entry), request.filters)) {
          next(entry);
        }
      };

      ctx.onDispose(() => {
        this._active.delete(logs);
      });

      logs.on(handler);
    });
  }

  private _logProcessor: LogProcessor = (_config, entry) => {
    this._active.forEach((event) => event.emit(entry));
  };
}

const transformLogEntry = (entry: LogEntry): NaturalLogEntry => {
  return {
    level: entry.level,
    message: entry.message,
    context: entry.context,
    meta: entry.meta && {
      file: entry.meta.file,
      line: entry.meta.line,
      scope: entry.meta.scope
    },
    error: entry.error && new Error(entry.error.message, { cause: entry.error.stack })
  };
};
