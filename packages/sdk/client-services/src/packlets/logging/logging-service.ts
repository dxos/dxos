//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { LogLevel, LogProcessor, LogEntry as NaturalLogEntry, getContextFromEntry, log } from '@dxos/log';
import { LogEntry, LoggingService, QueryLogsRequest } from '@dxos/protocols/proto/dxos/client/services';
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
    return new Stream<LogEntry>(({ ctx, next }) => {
      const handler = (entry: NaturalLogEntry) => {
        // This call was caused by the logging service itself.
        if (LOG_PROCESSING > 0) {
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

        if (!shouldLog(entry, request)) {
          return;
        }

        const record: LogEntry = {
          ...entry,
          context: jsonify(getContextFromEntry(entry)),
          timestamp: new Date(),
          // TODO(wittjosiah): Where does code come from?
          error: entry.error && { code: 'unknown', message: entry.error.message },
          meta: {
            // TODO(dmaretskyi): Fix proto.
            file: entry.meta?.file ?? '',
            line: entry.meta?.line ?? 0,
          },
        };

        try {
          LOG_PROCESSING++;
          next(record);
        } finally {
          LOG_PROCESSING--;
        }
      };

      this._logs.on(ctx, handler);
    });
  }

  private _logProcessor: LogProcessor = (_config, entry) => {
    this._logs.emit(entry);
  };
}

const matchFilter = (
  filter: QueryLogsRequest.Filter,
  level: LogLevel,
  path: string,
  options: QueryLogsRequest.MatchingOptions,
) => {
  switch (options) {
    case QueryLogsRequest.MatchingOptions.INCLUSIVE:
      return level >= filter.level && (!filter.pattern || path.includes(filter.pattern));
    case QueryLogsRequest.MatchingOptions.EXPLICIT:
      return level === filter.level && (!filter.pattern || path.includes(filter.pattern));
  }
};

/**
 * Determines if the current line should be logged (called by the processor).
 */
const shouldLog = (entry: NaturalLogEntry, request: QueryLogsRequest): boolean => {
  const options = request.options ?? QueryLogsRequest.MatchingOptions.INCLUSIVE;
  if (request.filters === undefined) {
    return options === QueryLogsRequest.MatchingOptions.INCLUSIVE;
  } else {
    return request.filters.some((filter) => matchFilter(filter, entry.level, entry.meta?.file ?? '', options));
  }
};

/**
 * Counter that is used to track whether we are processing a log entry.
 */
let LOG_PROCESSING = 0;
