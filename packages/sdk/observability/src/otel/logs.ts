//
// Copyright 2024 DXOS.org
//

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
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

import { type OtelOptions } from './otel';

export class OtelLogs {
  private _loggerProvider: LoggerProvider;
  constructor(private readonly options: OtelOptions) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    const resource = Resource.default().merge(
      new Resource({
        [SEMRESATTRS_SERVICE_NAME]: this.options.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: this.options.serviceVersion,
      }),
    );
    const collectorOptions = {
      url: this.options.endpoint + '/v1/logs',
      headers: {
        Authorization: this.options.authorizationHeader,
      },
      concurrencyLimit: 1, // an optional limit on pending requests
    };
    const logExporter = new OTLPLogExporter(collectorOptions);
    this._loggerProvider = new LoggerProvider({ resource });

    this._loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
  }

  public readonly logProcessor: LogProcessor = (config: LogConfig, entry: LogEntry) => {
    // loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(logExporter));
    const logger = this._loggerProvider.getLogger('dxos-observability', '0.0.0');

    if (!shouldLog(entry, config.filters)) {
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
