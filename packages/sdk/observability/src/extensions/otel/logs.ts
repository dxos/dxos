//
// Copyright 2024 DXOS.org
//

import { SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import {
  type LogConfig,
  type LogEntry,
  LogLevel,
  type LogProcessor,
  getContextFromEntry,
  getRelativeFilename,
} from '@dxos/log';

import { type OtelOptions, setDiagLogger } from './otel';

const FLATTEN_DEPTH = 1;

export type OtelLogOptions = OtelOptions & {
  logLevel: LogLevel;
  /**
   * Set `true` to capture logs sent through LoggingService from shared worker.
   * Better to set to `false` because shared worker is initializing its own logger.
   */
  includeSharedWorkerLogs: boolean;
};

export class OtelLogs {
  private _loggerProvider: LoggerProvider;
  constructor(private readonly options: OtelLogOptions) {
    setDiagLogger(options.consoleDiagLogLevel);
    const resource = defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: this.options.serviceName,
        [ATTR_SERVICE_VERSION]: this.options.serviceVersion,
      }),
    );
    const logExporter = new OTLPLogExporter({
      url: this.options.endpoint + '/v1/logs',
      headers: this.options.headers,
      concurrencyLimit: 10, // an optional limit on pending requests
    });
    this._loggerProvider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(logExporter)],
    });
  }

  public readonly logProcessor: LogProcessor = (_config: LogConfig, entry: LogEntry) => {
    const logger = this._loggerProvider.getLogger('dxos-observability', this.options.serviceVersion);

    if (
      entry.level < this.options.logLevel ||
      (!this.options.includeSharedWorkerLogs && entry.meta?.S?.remoteSessionId)
    ) {
      return;
    }

    const attributes = {
      ...this.options.getTags(),
      ...(entry.meta ? { meta: { file: getRelativeFilename(entry.meta.F), line: entry.meta.L } } : {}),
      ...(entry.error ? { error: entry.error.stack } : {}),
      ...stringifyValues(getContextFromEntry(entry), 'ctx_'),
    };

    logger.emit({
      severityNumber: convertLevel(entry.level),
      body: entry.message,
      attributes,
    });
  };

  flush(): Promise<void> {
    return this._loggerProvider.forceFlush();
  }

  close(): Promise<void> {
    return this._loggerProvider.shutdown();
  }
}

const convertLevel = (level: LogLevel): SeverityNumber => {
  switch (level) {
    case LogLevel.DEBUG:
      return SeverityNumber.DEBUG;
    case LogLevel.VERBOSE:
      return SeverityNumber.INFO;
    case LogLevel.INFO:
      return SeverityNumber.INFO;
    case LogLevel.WARN:
      return SeverityNumber.WARN;
    case LogLevel.ERROR:
      return SeverityNumber.ERROR;
    default:
      return SeverityNumber.ERROR;
  }
};

// TODO(wittjosiah): Reconcile logging utils w/ EDGE.
const stringifyValues = (object: object | undefined, keyPrefix?: string, depth: number = 1) => {
  if (!object) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined) {
      continue;
    }
    const newKey = keyPrefix ? `${keyPrefix}${key}` : key;
    if (typeof value === 'object') {
      if (!value || Array.isArray(value) || depth > FLATTEN_DEPTH) {
        result[newKey] = JSON.stringify(value);
      } else {
        const flattened = stringifyValues(value, `${newKey}_`, depth + 1);
        for (const [flattenedKey, flattenedValue] of Object.entries(flattened)) {
          result[flattenedKey] = flattenedValue;
        }
      }
    } else {
      result[newKey] = String(value);
    }
  }
  return result;
};
