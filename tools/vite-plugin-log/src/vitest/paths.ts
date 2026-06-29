//
// Copyright 2026 DXOS.org
//

import { closeSync, mkdirSync, openSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Resolve the NDJSON log file path for Vitest runs.
 *
 * Precedence: `DX_TEST_LOG_FILE` → `EDGE_TEST_LOG_FILE` (legacy edge name) → `<cwd>/test.log`.
 */
export const resolveTestLogFilePath = (cwd = process.cwd()): string =>
  process.env.DX_TEST_LOG_FILE ?? process.env.EDGE_TEST_LOG_FILE ?? join(cwd, 'test.log');

/**
 * Whether the Vitest file log sink is enabled for this process.
 * Set `DX_TEST_LOG=0` or `DX_TEST_LOG_FILE=` to disable.
 */
export const isTestLogFileEnabled = (): boolean =>
  process.env.DX_TEST_LOG !== '0' && process.env.DX_TEST_LOG_FILE !== '';

/**
 * Filter expression for the file sink (`LOG_FILTER` syntax).
 * `DX_TEST_LOG_FILTER` overrides `LOG_FILTER`; defaults to `debug`.
 */
export const resolveTestLogFilter = (): string => process.env.DX_TEST_LOG_FILTER ?? process.env.LOG_FILTER ?? 'debug';

/**
 * Truncate (create) the log file before a Vitest run.
 */
export const truncateTestLogFile = (path: string): void => {
  mkdirSync(dirname(path), { recursive: true });
  const fd = openSync(path, 'w');
  closeSync(fd);
};
