//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type TagResult,
  classifyTags,
  fixtureExists,
  loadFixtureMessages,
  round,
  runItemsBench,
  selectVariants,
} from '../testing/harness';

describe.skipIf(!fixtureExists())('tag messages incl. spam (multi-model)', () => {
  test(
    'classifies tags and spam across models',
    async ({ expect }) => {
      const messages = loadFixtureMessages();
      const variants = selectVariants();
      const result = await runItemsBench<(typeof messages)[number], TagResult>({
        name: 'tags',
        items: messages,
        variants,
        perItem: classifyTags,
        evaluate: (_variant, results) => {
          const allTags = results.flatMap((result) => result.tags);
          return {
            messages: results.length,
            spam: results.filter((result) => result.spam).length,
            distinctTags: new Set(allTags).size,
            tagsPerMessage: round(allTags.length / Math.max(1, results.length)),
          };
        },
      });
      expect(result.variants.length).toBe(variants.length);
    },
    60 * 60_000,
  );
});
