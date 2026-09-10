//
// Copyright 2026 DXOS.org
//

import { type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import { type AppManager } from './app-manager';

/**
 * Attaches each app's own debug log to the test result.
 *
 * Off unless `DX_E2E_CAPTURE_LOGS` is set; set it to `all` to capture passing tests too, which is
 * what gives a signal found in a failure something to be compared against. The store is written by
 * the observability worker on a
 * timer, so a record emitted moments before the assertion failed may not have been flushed; what
 * this is for is the long window before that, which the console cannot reach because it does not
 * survive the page reload `joinNewIdentity` performs.
 *
 * Reading it must never turn a passing test red, so a failure to read is attached as text rather
 * than thrown.
 */
export const captureDebugLogs = async (
  apps: Record<string, AppManager>,
  testInfo: TestInfo,
  { onlyOnFailure = true }: { onlyOnFailure?: boolean } = {},
): Promise<void> => {
  if (!process.env.DX_E2E_CAPTURE_LOGS) {
    return;
  }
  if (onlyOnFailure && process.env.DX_E2E_CAPTURE_LOGS !== 'all' && testInfo.status === testInfo.expectedStatus) {
    return;
  }

  for (const [name, app] of Object.entries(apps)) {
    // Written to `outputPath` and attached by path, not as a `body`: a body-only attachment lives
    // in the report, and the `line` reporter these soaks use never materializes one.
    const file = testInfo.outputPath(`${name}.log.ndjson`);
    try {
      const ndjson = await app.readDebugLog();
      // Written even when empty, because an absent file cannot distinguish "capture never ran"
      // from "the store had nothing", and that difference costs a whole soak to rediscover.
      await writeFile(file, ndjson.length > 0 ? ndjson : '{"note":"debug log store was empty"}\n', 'utf8');
    } catch (err) {
      await writeFile(file, `{"error":${JSON.stringify(String(err))}}\n`, 'utf8');
    }
    await testInfo.attach(`${name}.log.ndjson`, { path: file, contentType: 'application/x-ndjson' });
  }
};
