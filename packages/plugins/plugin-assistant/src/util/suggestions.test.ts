//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseSuggestions } from './suggestions';

describe('parseSuggestions', () => {
  test('returns [] for empty / undefined input', ({ expect }) => {
    expect(parseSuggestions(undefined)).toEqual([]);
    expect(parseSuggestions('')).toEqual([]);
    expect(parseSuggestions('Just a paragraph, no headings.')).toEqual([]);
  });

  test('extracts bullets from the Suggested starting prompts section', ({ expect }) => {
    const md = [
      '# Title',
      '',
      'Some intro.',
      '',
      '## Suggested starting prompts',
      '',
      '- "Give me a 30-second tour of Composer."',
      '- How do spaces work?',
      "- 'Single quoted prompt'",
      '',
      '## Out of scope',
      '',
      '- Should not appear',
    ].join('\n');
    expect(parseSuggestions(md)).toEqual([
      'Give me a 30-second tour of Composer.',
      'How do spaces work?',
      'Single quoted prompt',
    ]);
  });

  test('matches case-insensitively and accepts "starter prompts"', ({ expect }) => {
    expect(parseSuggestions('### SUGGESTED STARTER PROMPTS\n- Hello')).toEqual(['Hello']);
  });

  test('returns [] when section is missing or empty', ({ expect }) => {
    expect(parseSuggestions('## Other section\n- item')).toEqual([]);
    expect(parseSuggestions('## Suggested starting prompts\n\n## Next')).toEqual([]);
  });

  test('supports * and numbered bullets', ({ expect }) => {
    const md = ['## Suggested starting prompts', '* First', '+ Second', '1. Third'].join('\n');
    expect(parseSuggestions(md)).toEqual(['First', 'Second', 'Third']);
  });
});
