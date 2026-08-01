//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type ThreadSummaryResult,
  fixtureExists,
  groupThreads,
  loadFixtureMessages,
  round,
  runItemsBench,
  selectVariants,
  summarizeThread,
} from '../testing/harness';

describe.skipIf(!fixtureExists())('summarize threads (multi-model)', () => {
  test(
    'groups messages by thread and summarizes each across models',
    async ({ expect }) => {
      const threads = groupThreads(loadFixtureMessages());
      const variants = selectVariants();
      const result = await runItemsBench<(typeof threads)[number], ThreadSummaryResult>({
        name: 'summarize-threads',
        items: threads,
        variants,
        perItem: summarizeThread,
        renderResponse: (result) =>
          `_Thread ${result.threadId} · ${result.messageCount} message(s)_\n\n${result.summary}`,
        evaluate: (_variant, results) => {
          const summarized = results.filter((result) => result.summary.length > 0);
          return {
            threads: results.length,
            summarized: summarized.length,
            avgThreadSize: results.length
              ? round(results.reduce((sum, result) => sum + result.messageCount, 0) / results.length)
              : 0,
          };
        },
        meta: { threadCount: threads.length },
      });
      expect(result.variants.length).toBe(variants.length);
    },
    60 * 60_000,
  );
});
