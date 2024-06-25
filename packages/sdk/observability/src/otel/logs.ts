//
// Copyright 2024 DXOS.org
//

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { type LogConfig, type LogEntry, LogLevel, type LogProcessor, shouldLog } from '@dxos/log';

import { type OtelOptions } from './otel';

export class OtelLogs {
  constructor(private readonly options: OtelOptions) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  getLogProcessor(): LogProcessor {
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
    const loggerProvider = new LoggerProvider({ resource });

    loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));

    // TODO: namespace?
    const logger = loggerProvider.getLogger('dxos-observability', '0.0.0');
    return (config: LogConfig, entry: LogEntry) => {
      const { level, message, context, error } = entry;
      if (!shouldLog(entry, config.filters)) {
        return;
      }
      logger.emit({
        severityNumber: convertLevel(level),
        body: { message, error: error ?? undefined, ...context },
        attributes: this.options.getTags(),
      });
    };
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
