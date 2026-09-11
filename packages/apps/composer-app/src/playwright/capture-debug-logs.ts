//
// Copyright 2026 DXOS.org
//

import { type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import { type AppManager } from './app-manager.ts';

/** Values of `DX_E2E_CAPTURE_LOGS` that enable capture; `all` also captures passing tests. */
const ENABLED = new Set(['1', 'true', 'all']);

/** Bounds the read so a wedged page fails the capture rather than the hook's whole timeout. */
const READ_TIMEOUT = 30_000;

/**
 * Writes each app's debug log beside the test's other output.
 *
 * Off unless `DX_E2E_CAPTURE_LOGS` is `1`, `true` or `all`; only `all` captures a passing test,
 * which is what a signal found in a failure can be compared against.
 *
 * The store is flushed by a worker on a timer, so the last moments before an assertion fails may
 * be missing; what this reaches is the long window before that, including everything before the
 * page reload, which no console log survives.
 *
 * Capture never fails a test: every path is caught, and the reason is written to the file instead.
 */
export const captureDebugLogs = async (apps: Record<string, AppManager>, testInfo: TestInfo): Promise<void> => {
  const mode = process.env.DX_E2E_CAPTURE_LOGS;
  if (!mode || !ENABLED.has(mode)) {
    return;
  }
  if (mode !== 'all' && testInfo.status === testInfo.expectedStatus) {
    return;
  }

  for (const [name, app] of Object.entries(apps)) {
    try {
      const ndjson = await Promise.race([
        app.readDebugLog(),
        new Promise<string>((_resolve, reject) =>
          setTimeout(() => reject(new Error(`readDebugLog timed out after ${READ_TIMEOUT}ms`)), READ_TIMEOUT),
        ),
      ]);
      // Written even when empty: an absent file cannot say whether capture ran at all.
      await writeFile(
        testInfo.outputPath(`${name}.log.ndjson`),
        ndjson.length > 0 ? ndjson : '{"note":"debug log store was empty"}\n',
        'utf8',
      );
    } catch (err) {
      await writeFile(
        testInfo.outputPath(`${name}.log.ndjson`),
        `{"error":${JSON.stringify(String(err))}}\n`,
        'utf8',
      ).catch(() => {});
    }
  }
};
