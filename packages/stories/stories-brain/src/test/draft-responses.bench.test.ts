//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type DraftResult,
  draftReply,
  fixtureExists,
  loadFixtureMessages,
  round,
  runItemsBench,
  selectVariants,
} from '../testing/harness';

describe.skipIf(!fixtureExists())('draft replies (multi-model)', () => {
  test(
    'drafts a reply to each message across models',
    async ({ expect }) => {
      const messages = loadFixtureMessages();
      const variants = selectVariants();
      const result = await runItemsBench<(typeof messages)[number], DraftResult>({
        name: 'draft-responses',
        items: messages,
        variants,
        perItem: draftReply,
        renderResponse: (result) =>
          `_${result.subject || result.messageId}_\n\n` +
          (result.skipped ? '_(skipped: not replyable)_' : result.draft || '_(no draft)_'),
        evaluate: (_variant, results) => {
          const skipped = results.filter((result) => result.skipped).length;
          const drafted = results.filter((result) => !result.skipped && result.draft.length > 0);
          const totalChars = drafted.reduce((sum, result) => sum + result.draft.length, 0);
          return {
            messages: results.length,
            skipped,
            drafted: drafted.length,
            avgDraftChars: drafted.length ? round(totalChars / drafted.length) : 0,
          };
        },
      });
      expect(result.variants.length).toBe(variants.length);
    },
    60 * 60_000,
  );
});
