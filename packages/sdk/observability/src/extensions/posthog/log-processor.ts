//
// Copyright 2025 DXOS.org
//

import posthog from 'posthog-js';

import { InvariantViolation } from '@dxos/invariant';
import { type LogConfig, type LogEntry, LogLevel, type LogProcessor, shouldLog } from '@dxos/log';
import { getDebugName } from '@dxos/util';

export const logProcessor: LogProcessor = (config: LogConfig, entry: LogEntry) => {
  // Don't forward logs from remote sessions.
  if (!shouldLog(entry, config.captureFilters) || entry.meta?.S?.remoteSessionId) {
    return;
  }

  let capturedError = entry.error;
  if (capturedError == null && entry.level === LogLevel.ERROR) {
    capturedError = Object.values(entry.context ?? {}).find((v): v is Error => v instanceof Error);
  }

  if (!capturedError) {
    return;
  }

  const additionalProperties: Record<string, string | boolean | number> = {};
  if (entry.meta) {
    additionalProperties.transaction = `${getRelativeFilename(entry.meta.F)}:${entry.meta.L}`;
    if (entry.meta.S?.hostSessionId) {
      additionalProperties.service_host_issue = true;
      additionalProperties.service_host_session = entry.meta.S?.hostSessionId;
    }
    if (!Number.isNaN(entry.meta.S?.uptimeSeconds)) {
      additionalProperties.uptime_seconds = entry.meta.S?.uptimeSeconds;
    }
  }

  if (capturedError instanceof InvariantViolation) {
    additionalProperties.invariant_violation = true;
  }
  const isMessageDifferentFromStackTrace = capturedError == null;
  if (isMessageDifferentFromStackTrace) {
    additionalProperties.message = formatMessage(entry);
  }

  posthog.captureException(capturedError, additionalProperties);
};

const formatMessage = (entry: LogEntry): string => {
  const message = entry.message ?? (entry.error ? (entry.error.message ?? String(entry.error)) : '');

  let scopePrefix: string | undefined;
  if (entry.meta?.S) {
    const scope = entry.meta?.S;
    scopePrefix = scope.name || getDebugName(scope);
  }
  if (scopePrefix == null) {
    return message;
  }

  const workerPrefix = entry.meta?.S?.hostSessionId ? '[worker] ' : '';
  return `${workerPrefix}${scopePrefix} ${message}`;
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
