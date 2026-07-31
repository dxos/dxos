//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type QuestionResult,
  extractQuestions,
  fixtureExists,
  loadFixtureMessages,
  round,
  runItemsBench,
  selectVariants,
} from '../testing/harness';

describe.skipIf(!fixtureExists())('extract questions/requests per message (multi-model)', () => {
  test(
    'extracts questions grouped by message across models',
    async ({ expect }) => {
      const messages = loadFixtureMessages();
      const variants = selectVariants();
      const result = await runItemsBench<(typeof messages)[number], QuestionResult>({
        name: 'extract-questions',
        items: messages,
        variants,
        perItem: extractQuestions,
        renderResponse: (result) =>
          `_${result.subject || result.messageId}_\n\n` +
          (result.items.length
            ? result.items.map((item, index) => `${index + 1}. [${item.kind}] ${item.text}`).join('\n')
            : '_(nothing)_'),
        evaluate: (_variant, results) => {
          const items = results.flatMap((result) => result.items);
          const countOf = (kind: string) => items.filter((item) => item.kind === kind).length;
          return {
            messages: results.length,
            messagesWithItems: results.filter((result) => result.items.length > 0).length,
            questions: countOf('question'),
            requests: countOf('request'),
            notifications: countOf('notification'),
            itemsPerMessage: round(items.length / Math.max(1, results.length)),
          };
        },
      });
      expect(result.variants.length).toBe(variants.length);
    },
    60 * 60_000,
  );
});
