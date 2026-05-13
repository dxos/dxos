//
// Copyright 2025 DXOS.org
//

import posthog from 'posthog-js';

import { InvariantViolation } from '@dxos/invariant';
import { type LogConfig, type LogEntry, LogLevel, type LogProcessor, shouldLog } from '@dxos/log';

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
  const { filename, line } = entry.computedMeta;
  if (filename !== undefined && line !== undefined) {
    additionalProperties.transaction = `${filename}:${line}`;
  }
  if (entry.meta?.S?.hostSessionId) {
    additionalProperties.service_host_issue = true;
    additionalProperties.service_host_session = entry.meta.S.hostSessionId;
  }
  if (entry.meta?.S?.uptimeSeconds != null) {
    additionalProperties.uptime_seconds = entry.meta.S.uptimeSeconds;
  }

  if (capturedError instanceof InvariantViolation) {
    additionalProperties.invariant_violation = true;
  }

  posthog.captureException(capturedError, additionalProperties);
};
