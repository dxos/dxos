//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type SummaryResult,
  fixtureExists,
  loadFixtureMessages,
  round,
  runItemsBench,
  selectVariants,
  summarizeMessage,
} from './harness';

describe.skipIf(!fixtureExists())('summarize messages (multi-model)', () => {
  test(
    'summarizes each message across models',
    async ({ expect }) => {
      const messages = loadFixtureMessages();
      const variants = selectVariants();
      const result = await runItemsBench<(typeof messages)[number], SummaryResult>({
        name: 'summarize-messages',
        items: messages,
        variants,
        perItem: summarizeMessage,
        evaluate: (_variant, results) => {
          const summarized = results.filter((result) => result.summary.length > 0);
          const totalChars = summarized.reduce((sum, result) => sum + result.summary.length, 0);
          return {
            messages: results.length,
            summarized: summarized.length,
            avgSummaryChars: summarized.length ? round(totalChars / summarized.length) : 0,
          };
        },
      });
      expect(result.variants.length).toBe(variants.length);
    },
    60 * 60_000,
  );
});
