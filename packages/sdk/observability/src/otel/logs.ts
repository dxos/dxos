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
  shouldLog,
} from '@dxos/log';
import { jsonlogify } from '@dxos/util';

import { type OtelOptions, setDiagLogger } from './otel';

export class OtelLogs {
  private _loggerProvider: LoggerProvider;
  constructor(private readonly options: OtelOptions) {
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

    if (!shouldLog(entry, config.captureFilters) || entry.meta?.S?.remoteSessionId) {
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

  flush() {
    return this._loggerProvider.forceFlush();
  }

  close() {
    return this._loggerProvider.shutdown();
  }
}

const convertLevel = (level: LogLevel): SeverityNumber => {
  switch (level) {
    case LogLevel.DEBUG:
      return SeverityNumber.DEBUG;
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
