//
// Copyright 2026 DXOS.org
//

import { type LogEntry, shortLevelName } from '@dxos/log';

/**
 * Serializable projection of a {@link LogEntry} for display and clipboard export.
 */
export type LogRecord = {
  timestamp: string;
  level: string;
  file?: string;
  line?: number;
  message?: string;
  context?: Record<string, unknown>;
  error?: string;
};

/** Flattens a log entry into a JSON-safe record via the entry's computed getters. */
export const formatLogEntry = ({
  timestamp,
  level,
  message,
  computedMeta,
  computedContext,
  computedError,
}: LogEntry): LogRecord => {
  return {
    timestamp: new Date(timestamp).toISOString(),
    level: shortLevelName[level],
    file: computedMeta.filename?.split('/').pop(),
    line: computedMeta.line,
    message,
    context: Object.keys(computedContext).length > 0 ? computedContext : undefined,
    error: computedError,
  };
};
