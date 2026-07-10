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
          (result.questions.length
            ? result.questions.map((question, index) => `${index + 1}. ${question}`).join('\n')
            : '_(no questions)_'),
        evaluate: (_variant, results) => {
          const total = results.reduce((sum, result) => sum + result.questions.length, 0);
          return {
            messages: results.length,
            messagesWithQuestions: results.filter((result) => result.questions.length > 0).length,
            totalQuestions: total,
            questionsPerMessage: round(total / Math.max(1, results.length)),
          };
        },
      });
      expect(result.variants.length).toBe(variants.length);
    },
    60 * 60_000,
  );
});
