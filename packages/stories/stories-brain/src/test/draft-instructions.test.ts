//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_DRAFT_INSTRUCTIONS, buildDraftPrompt } from '../testing/harness';

// Deterministic coverage for the default draft Instructions + prompt assembly — no fixture / model
// required (the model-graded re-score lives in draft-responses.bench.test.ts).

describe('DEFAULT_DRAFT_INSTRUCTIONS', () => {
  test('steers plain, direct prose', ({ expect }) => {
    const text = DEFAULT_DRAFT_INSTRUCTIONS.toLowerCase();
    expect(text).toContain('plainly');
    expect(text).toContain('directly');
  });

  test('names the obsequious phrases to avoid (so the model steers off them)', ({ expect }) => {
    // The instructions cite the hedging patterns as negative examples; they must not be endorsed as
    // the style. Presence here is intentional (a "do not write this" list).
    expect(DEFAULT_DRAFT_INSTRUCTIONS).toContain('if I may be so bold');
    expect(DEFAULT_DRAFT_INSTRUCTIONS.toLowerCase()).toContain('no obsequious');
  });
});

describe('buildDraftPrompt', () => {
  test('applies the default instructions when none are given', ({ expect }) => {
    const prompt = buildDraftPrompt();
    expect(prompt).toContain('Additional instructions from the user');
    expect(prompt).toContain('Lead with the answer');
    expect(prompt).toContain('Draft a reply to the email below'); // Base rules retained.
  });

  test('an explicit empty string opts out — base rules only', ({ expect }) => {
    const prompt = buildDraftPrompt('');
    expect(prompt).not.toContain('Additional instructions from the user');
    expect(prompt).toContain('Draft a reply to the email below');
  });

  test('a custom instruction overrides the default', ({ expect }) => {
    const prompt = buildDraftPrompt('Always sign off as "The Team".');
    expect(prompt).toContain('Always sign off as "The Team".');
    expect(prompt).not.toContain('Lead with the answer'); // Default not appended.
  });
});
