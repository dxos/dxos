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
    const filters = request.filters?.length ? request.filters : undefined;
    return new Stream<LogEntry>(({ ctx, next }) => {
      const handler = (entry: LogEntry) => {
        // Prevent logging feedback loop from logging service.
        if (
          entry.meta?.file.includes('logging-service') ||
          (entry.context &&
            Object.values(entry.context).some((value) => typeof value === 'string' && value.includes('LoggingService')))
        ) {
          return;
        }

        if (shouldLog(transformLogEntry(entry), filters)) {
          next(jsonify(entry));
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

/**
 * Recursively converts an object into a JSON-compatible object.
 */
const jsonify = (value: any): any => {
  if (typeof value === 'function') {
    return null;
  } else if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map(jsonify);
    } else {
      if (typeof value.toJSON === 'function') {
        return value.toJSON();
      }
      const res: any = {};
      for (const key of Object.keys(value)) {
        res[key] = jsonify(value[key]);
      }
      return res;
    }
  } else {
    return value;
  }
};
