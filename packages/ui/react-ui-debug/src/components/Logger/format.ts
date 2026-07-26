//
// Copyright 2026 DXOS.org
//

import { type LogEntry, shortLevelName } from '@dxos/log';

/** Derive the workspace package directory from a source path (…/packages/<group>/<pkg>/…). */
export const packageName = (file: string): string | undefined => file.match(/packages\/[^/]+\/([^/]+)\//)?.[1];

/**
 * Serializable projection of a {@link LogEntry} for display and clipboard export.
 */
export type LogRecord = {
  timestamp: string;
  level: string;
  package?: string;
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
    package: computedMeta.filename ? packageName(computedMeta.filename) : undefined,
    file: computedMeta.filename?.split('/').pop(),
    line: computedMeta.line,
    message,
    context: Object.keys(computedContext).length > 0 ? computedContext : undefined,
    error: computedError,
  };
};
