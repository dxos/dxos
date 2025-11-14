//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { PublicKey } from '@dxos/keys';
import {
  type LogLevel,
  type LogProcessor,
  type LogEntry as NaturalLogEntry,
  getContextFromEntry,
  log,
} from '@dxos/log';
import {
  type ControlMetricsRequest,
  type ControlMetricsResponse,
  type LogEntry,
  type LoggingService,
  type Metrics,
  QueryLogsRequest,
  type QueryMetricsRequest,
  type QueryMetricsResponse,
} from '@dxos/protocols/proto/dxos/client/services';
import { getDebugName, jsonify, numericalValues, tracer } from '@dxos/util';

/**
 * Logging service used to spy on logs of the host.
 */
export class LoggingServiceImpl implements LoggingService {
  private readonly _logs = new Event<NaturalLogEntry>();
  private readonly _started = Date.now();
  private readonly _sessionId = PublicKey.random().toHex();

  async open(): Promise<void> {
    log.runtimeConfig.processors.push(this._logProcessor);
  }

  async close(): Promise<void> {
    const index = log.runtimeConfig.processors.findIndex((processor: LogProcessor) => processor === this._logProcessor);
    log.runtimeConfig.processors.splice(index, 1);
  }

  async controlMetrics({ reset, record }: ControlMetricsRequest): Promise<ControlMetricsResponse> {
    if (reset) {
      tracer.clear();
    }

    if (record === true) {
      tracer.start();
    } else if (record === false) {
      tracer.stop();
    }

    return { recording: tracer.recording };
  }

  /**
   * @deprecated (Move to diagnostics).
   */
  queryMetrics({ interval = 5_000 }: QueryMetricsRequest): Stream<QueryMetricsResponse> {
    // TODO(burdon): Map all traces; how to bind to reducer/metrics shape (e.g., numericalValues)?
    const getNumericalValues = (key: string) => {
      const events = tracer.get(key) ?? [];
      return { key, stats: numericalValues(events, 'duration') };
    };

    return new Stream(({ next }) => {
      const update = () => {
        const metrics: Metrics = {
          timestamp: new Date(),
          values: [
            getNumericalValues('dxos.echo.pipeline.control'),
            getNumericalValues('dxos.echo.pipeline.data'),
          ].filter(Boolean) as Metrics.KeyPair[],
        };

        next({
          timestamp: new Date(),
          metrics,
        });
      };

      update();
      const i = setInterval(update, Math.max(interval, 1_000));
      return () => {
        clearInterval(i);
      };
    });
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
          entry.meta?.F.includes('logging-service') ||
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
          message: entry.message ?? (entry.error ? (entry.error.message ?? String(entry.error)) : ''),
          context: jsonify(getContextFromEntry(entry)),
          timestamp: new Date(),
          meta: {
            // TODO(dmaretskyi): Fix proto.
            file: entry.meta?.F ?? '',
            line: entry.meta?.L ?? 0,
            scope: {
              hostSessionId: this._sessionId,
              uptimeSeconds: (Date.now() - this._started) / 1000,
              name: getDebugName(entry.meta?.S),
            },
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
    return request.filters.some((filter) => matchFilter(filter, entry.level, entry.meta?.F ?? '', options));
  }
};

/**
 * Counter that is used to track whether we are processing a log entry.
 */
let LOG_PROCESSING = 0;
