//
// Copyright 2024 DXOS.org
//

import type { Breadcrumb, SeverityLevel, Event } from '@sentry/types';

import { type LogConfig, type LogEntry, LogLevel, type LogProcessor, shouldLog } from '@dxos/log';
import { CircularBuffer, getDebugName } from '@dxos/util';

import { withScope, captureException, captureMessage } from './node';

const MAX_LOG_BREADCRUMBS = 80;

export class SentryLogProcessor {
  private _breadcrumbs = new CircularBuffer<Breadcrumb>(MAX_LOG_BREADCRUMBS);

  public readonly logProcessor: LogProcessor = (config: LogConfig, entry: LogEntry) => {
    const { level, meta, error } = entry;
    if (!shouldLog(entry, config.captureFilters)) {
      return;
    }
    if (entry.level !== LogLevel.WARN && entry.level !== LogLevel.ERROR) {
      return;
    }
    // TODO(nf): add rate limiting to avoid spamming Sentry/consuming excessive quota.
    withScope((scope) => {
      const severity = convertLevel(level);
      scope.setLevel(severity);
      scope.setContext('dxoslog', entry.context ?? null);
      if (meta) {
        scope.setTag('transaction', `${getRelativeFilename(meta.F)}:${meta.L}`);

        if (meta.S?.hostSessionId) {
          scope.setTags({
            service_host_issue: true,
            service_host_session: meta.S?.hostSessionId,
          });
        }

        if (!Number.isNaN(meta.S?.uptimeSeconds)) {
          scope.setExtra('uptime_seconds', meta.S?.uptimeSeconds);
        }
      }

      const extendedMessage = formatMessageForSentry(entry);
      let capturedError = error;
      if (capturedError == null && entry.level === LogLevel.ERROR) {
        capturedError = Object.values(entry.context ?? {}).find((v): v is Error => v instanceof Error);
      }
      if (capturedError) {
        const isMessageDifferentFromStackTrace = error == null;
        if (isMessageDifferentFromStackTrace) {
          scope.setExtra('message', extendedMessage);
        }
        const eventId = captureException(capturedError);
        this._addBreadcrumb(eventId, extendedMessage, severity, entry.context);
        return;
      }

      scope.setFingerprint([entry.message]);
      const eventId = captureMessage(extendedMessage);
      this._addBreadcrumb(eventId, extendedMessage, severity, entry.context);
    });
  };

  public addLogBreadcrumbsTo(event: Event) {
    event.breadcrumbs ??= [];
    for (const breadcrumb of this._breadcrumbs) {
      event.breadcrumbs.push(breadcrumb);
    }
    event.breadcrumbs.sort((b1, b2) => {
      if (b1.timestamp === undefined || b2.timestamp === undefined) {
        return b1.timestamp === b2.timestamp ? 0 : b1.timestamp === undefined ? -1 : 1;
      }
      return b1.timestamp - b2.timestamp;
    });
  }

  private _addBreadcrumb(
    eventId: string,
    message: string,
    severity: SeverityLevel,
    context: { [key: string]: any } | undefined,
  ): void {
    const breadcrumb: Breadcrumb = {
      type: 'console',
      level: severity,
      event_id: eventId,
      category: 'log',
      message,
      data: context,
      timestamp: Math.floor(Date.now() / 1000),
    };
    const lastRecorded = this._breadcrumbs.getLast();
    if (lastRecorded && lastRecorded.message === breadcrumb.message) {
      const firstBreadcrumbData = lastRecorded.data?.firstBreadcrumbData ?? lastRecorded.data ?? {};
      const mergedBreadcrumbCount = Number.isNaN(lastRecorded.data?.mergedBreadcrumbCount)
        ? 1
        : Number(lastRecorded.data?.mergedBreadcrumbCount);
      lastRecorded.data = {
        mergedBreadcrumbCount: mergedBreadcrumbCount + 1,
        firstBreadcrumbData,
        lastBreadcrumbData: breadcrumb.data,
      };
      return;
    }
    this._breadcrumbs.push(breadcrumb);
  }
}

const formatMessageForSentry = (entry: LogEntry) => {
  let scopePrefix: string | undefined;
  if (entry.meta?.S) {
    const scope = entry.meta?.S;
    scopePrefix = scope.name || getDebugName(scope);
  }
  if (scopePrefix == null) {
    return entry.message;
  }
  const workerPrefix = entry.meta?.S?.hostSessionId ? '[worker] ' : '';
  return `${workerPrefix}${scopePrefix} ${entry.message}`;
};

const convertLevel = (level: LogLevel): SeverityLevel => {
  if (level === LogLevel.TRACE) {
    return 'debug';
  }
  if (level === LogLevel.WARN) {
    return 'warning';
  }
  return LogLevel[level].toLowerCase() as SeverityLevel;
};

const getRelativeFilename = (filename: string) => {
  // TODO(burdon): Hack uses "packages" as an anchor (pre-parse NX?)
  // Including `packages/` part of the path so that excluded paths (e.g. from dist) are clickable in vscode.
  const match = filename.match(/.+\/(packages\/.+\/.+)/);
  if (match) {
    const [, filePath] = match;
    return filePath;
  }

  return filename;
};
