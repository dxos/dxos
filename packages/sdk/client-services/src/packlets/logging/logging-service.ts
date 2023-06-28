//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { log, LogEntry as NaturalLogEntry, LogProcessor, shouldLog, getContextFromEntry } from '@dxos/log';
import { LoggingService, LogEntry, QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { jsonify } from '@dxos/util';

/**
 * Logging service used to spy on logs of the host.
 */
export class LoggingServiceImpl implements LoggingService {
  private readonly _logs = new Event<NaturalLogEntry>();

  async open() {
    log.runtimeConfig.processors.push(this._logProcessor);
  }

  async close() {
    const index = log.runtimeConfig.processors.findIndex((processor) => processor === this._logProcessor);
    log.runtimeConfig.processors.splice(index, 1);
  }

  queryLogs(request: QueryLogsRequest): Stream<LogEntry> {
    const filters = request.filters?.length ? request.filters : undefined;
    return new Stream<LogEntry>(({ ctx, next }) => {
      const handler = (entry: NaturalLogEntry) => {
        // This call was caused by the logging service itself.
        if(LOG_PROCESSING > 0) {
          return;
        }

        // Prevent logging feedback loop from logging service.
        if (
          entry.meta?.file.includes('logging-service') ||
          (entry.context &&
            Object.values(entry.context).some((value) => typeof value === 'string' && value.includes('LoggingService')))
        ) {
          return;
        }

        if (!shouldLog(entry, filters)) {
          return;
        }
        
        const record: LogEntry = {
          ...entry,
          context: jsonify(getContextFromEntry(entry)),
          meta: {
            // TODO(dmaretskyi): Fix proto.
            file: entry.meta?.file!,
            line: entry.meta?.line!,
          }
        };

        try {
          LOG_PROCESSING++;
          next(record);
        } finally {
          LOG_PROCESSING--;
        }
      };

      ctx.onDispose(() => {
        this._logs.off(handler);
      });

      this._logs.on(handler);
    });
  }

  private _logProcessor: LogProcessor = (_config, entry) => {
    this._logs.emit(entry);
  };
}

/**
 * Counter that is used to track whether we are processing a log entry.
 */
let LOG_PROCESSING = 0;