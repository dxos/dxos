//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_EMAIL_PROMPTS, mergePrompts } from './prompts';

describe('prompts', () => {
  test('defaults cover every prompt slot', ({ expect }) => {
    expect(DEFAULT_EMAIL_PROMPTS.topicSummary.length).toBeGreaterThan(0);
    expect(DEFAULT_EMAIL_PROMPTS.digest.length).toBeGreaterThan(0);
  });

  test('mergePrompts overrides only the given slots', ({ expect }) => {
    const merged = mergePrompts({ digest: 'Custom digest prompt.' });
    expect(merged.digest).toBe('Custom digest prompt.');
    expect(merged.topicSummary).toBe(DEFAULT_EMAIL_PROMPTS.topicSummary);
  });

  test('mergePrompts with no overrides returns the defaults', ({ expect }) => {
    expect(mergePrompts()).toEqual(DEFAULT_EMAIL_PROMPTS);
  });
});
