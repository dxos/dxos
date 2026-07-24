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
export const formatLogEntry = (entry: LogEntry): LogRecord => {
  const context = entry.computedContext;
  return {
    timestamp: new Date(entry.timestamp).toISOString(),
    level: shortLevelName[entry.level],
    file: entry.computedMeta.filename?.split('/').pop(),
    line: entry.computedMeta.line,
    message: entry.message,
    context: Object.keys(context).length > 0 ? context : undefined,
    error: entry.computedError,
  };
};
