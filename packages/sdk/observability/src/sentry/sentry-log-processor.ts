//
// Copyright 2024 DXOS.org
//

import type { SeverityLevel } from '@sentry/types';

import { type LogConfig, type LogEntry, LogLevel, type LogProcessor, shouldLog } from '@dxos/log';
import { getPrototypeSpecificInstanceId } from '@dxos/util';

import { withScope, captureException, captureMessage } from './';

export const createSentryLogProcessor = (): LogProcessor => {
  return (config: LogConfig, entry: LogEntry) => {
    const { message, level, meta, error } = entry;
    if (!shouldLog(entry, config.captureFilters)) {
      return;
    }
    if (entry.level !== LogLevel.WARN && entry.level !== LogLevel.ERROR) {
      return;
    }
    // TODO(nf): add rate limiting to avoid spamming Sentry/consuming excessive quota.
    withScope((scope) => {
      scope.setLevel(convertLevel(level));
      scope.setContext('dxoslog', entry.context);
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

      const message = formatMessageForSentry(entry);
      let capturedError = error;
      if (capturedError == null && entry.level === LogLevel.ERROR) {
        capturedError = Object.values(context).find((v) => v instanceof Error);
      }
      if (capturedError) {
        scope.setExtra('message', message);
        return captureException(capturedError);
      }

      captureMessage(message);
    });
  };
};

const formatMessageForSentry = (entry: LogEntry) => {
  let scopePrefix: string | undefined;
  if (entry.meta?.S) {
    const scope = entry.meta?.S;
    const prototype = Object.getPrototypeOf(scope);
    const id = getPrototypeSpecificInstanceId(scope);
    scopePrefix = `${prototype.constructor.name}#${id}`;
  }
  if (scopePrefix == null) {
    return entry.message;
  }
  const workerPrefix = '[worker] ';
  if (!entry.message.startsWith(workerPrefix)) {
    return `${scopePrefix} ${entry.message}`;
  }
  return `${workerPrefix}${scopePrefix} ${entry.message.slice(workerPrefix.length)}`;
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
