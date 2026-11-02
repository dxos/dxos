//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as SteCheck from './SteCheck.ts';
import { WORD_LIST_ENTRIES } from './word-list.ts';

describe('check', () => {
  test('approved text has no errors', ({ expect }) => {
    const report = SteCheck.check('Remove the four bolts. Install the cover.', { mode: 'procedural' });
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.unknownWords).toEqual(['four', 'bolts', 'cover']);
  });

  test('finds structural errors', ({ expect }) => {
    const report = SteCheck.check("You should check the valve; it's broken. The file has been deleted.");
    expect(report.errors.map((finding) => finding.rule)).toEqual(['8.1', '4.2', '3.2', '3.4']);
  });

  test('finds the passive voice and progressive forms', ({ expect }) => {
    const report = SteCheck.check('The circuits are connected by a relay. The pump is running.', { vocabulary: false });
    expect(report.errors.map((finding) => finding.rule)).toEqual(['3.6', '3.5']);
  });

  test('procedural sentences have a shorter limit than descriptive sentences', ({ expect }) => {
    const sentence = `${Array.from({ length: 22 }, () => 'word').join(' ')}.`;
    expect(SteCheck.check(sentence, { mode: 'procedural', vocabulary: false }).errors).toHaveLength(1);
    expect(SteCheck.check(sentence, { mode: 'descriptive', vocabulary: false }).errors).toHaveLength(0);
    expect(SteCheck.check(sentence, { mode: 'mixed', vocabulary: false }).warnings).toHaveLength(1);
  });

  test('paragraphs have a maximum of six sentences', ({ expect }) => {
    const report = SteCheck.check('Stop. Stop. Stop. Stop. Stop. Stop. Stop.', { vocabulary: false });
    expect(report.errors.map((finding) => finding.rule)).toEqual(['6.6']);
  });

  test('ignores code, URLs and quoted text', ({ expect }) => {
    const report = SteCheck.check(
      ['Run `pnpm install --shouldnt`. Open https://example.com/would.', '', '```', "can't; won't", '```'].join('\n'),
      { vocabulary: false },
    );
    expect(report.errors).toEqual([]);
  });

  test('counts a parenthesis and a hyphenated group as one word', ({ expect }) => {
    expect(SteCheck.countWords('Use the left-hand valve (refer to figure 2).')).toBe(5);
  });
});

describe('parseWordList', () => {
  test('includes forms and noun plurals', ({ expect }) => {
    const approved = SteCheck.parseWordList(WORD_LIST_ENTRIES);
    expect(WORD_LIST_ENTRIES.length).toBeGreaterThan(800);
    expect(approved.has('absorbed')).toBe(true);
    expect(approved.has('accidents')).toBe(true);
    expect(approved.has('should')).toBe(false);
  });
});
