//
// Copyright 2025 DXOS.org
//

import posthog from 'posthog-js';

import { InvariantViolation } from '@dxos/invariant';
import { type LogConfig, type LogEntry, LogLevel, type LogProcessor, getContextFromEntry, shouldLog } from '@dxos/log';

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

  // Forward primitive context values so callers can attach queryable attributes (e.g. fatal_dialog: true).
  const context = getContextFromEntry(entry);
  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
        additionalProperties[key] = value;
      }
    }
  }

  try {
    posthog.captureException(capturedError, additionalProperties);
  } catch (err) {
    // A processor throws back into `log.error`'s caller: posthog's error coercion has thrown on
    // exotic error shapes (e.g. an Effect `TimeoutError`), which crashed the fatal-dialog render
    // and hid the very error it was reporting. Telemetry must never break the reporting path.
    console.warn('posthog.captureException failed', err);
  }
};
