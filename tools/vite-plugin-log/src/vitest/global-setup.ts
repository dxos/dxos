//
// Copyright 2026 DXOS.org
//

import { isTestLogFileEnabled, resolveTestLogFilePath, truncateTestLogFile } from './paths';

/**
 * Vitest `globalSetup` hook — truncates the test log file once in the parent process
 * before worker threads start.
 */
const globalSetup = (): void => {
  if (!isTestLogFileEnabled()) {
    return;
  }
  const path = resolveTestLogFilePath();
  truncateTestLogFile(path);
  // eslint-disable-next-line no-console
  console.log(
    `[vitest] test log file: ${path} (filter: ${process.env.DX_TEST_LOG_FILTER ?? process.env.LOG_FILTER ?? 'debug'})`,
  );
};

export default globalSetup;
