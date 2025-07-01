//
// Copyright 2024 DXOS.org
//

import { SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import {
  getContextFromEntry,
  getRelativeFilename,
  type LogConfig,
  type LogEntry,
  LogLevel,
  type LogProcessor,
} from '@dxos/log';
import { jsonlogify } from '@dxos/util';

import { type OtelOptions, setDiagLogger } from './otel';

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
    const resource = Resource.default().merge(
      new Resource({
        [SEMRESATTRS_SERVICE_NAME]: this.options.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: this.options.serviceVersion,
      }),
    );
    const logExporter = new OTLPLogExporter({
      url: this.options.endpoint + '/v1/logs',
      headers: {
        Authorization: this.options.authorizationHeader,
      },
      concurrencyLimit: 10, // an optional limit on pending requests
    });
    this._loggerProvider = new LoggerProvider({ resource });
    this._loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
  }

  public readonly logProcessor: LogProcessor = (config: LogConfig, entry: LogEntry) => {
    const logger = this._loggerProvider.getLogger('dxos-observability', this.options.serviceVersion);

    if (
      entry.level < this.options.logLevel ||
      (!this.options.includeSharedWorkerLogs && entry.meta?.S?.remoteSessionId)
    ) {
      return;
    }

    const record = {
      ...entry,
      ...(entry.meta ? { meta: { file: getRelativeFilename(entry.meta.F), line: entry.meta.L } } : {}),
      context: jsonlogify(getContextFromEntry(entry)),
    };

    logger.emit({
      severityNumber: convertLevel(entry.level),
      body: JSON.stringify(record),
      attributes: this.options.getTags(),
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
