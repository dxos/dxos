//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { lineText } from './slash-commands.ts';

describe('lineText', () => {
  test('drops the marker of a list item, task, quote or heading', ({ expect }) => {
    expect(lineText('- A move is checked.')).toBe('A move is checked.');
    expect(lineText('  * Nested item ')).toBe('Nested item');
    expect(lineText('12. Numbered')).toBe('Numbered');
    expect(lineText('- [x] Done task')).toBe('Done task');
    expect(lineText('> Quoted')).toBe('Quoted');
    expect(lineText('## Heading')).toBe('Heading');
    expect(lineText('> - [ ] Quoted task')).toBe('Quoted task');
    expect(lineText('> ## Quoted heading')).toBe('Quoted heading');
  });

  test('keeps the text of a heading whole', ({ expect }) => {
    expect(lineText('# 1. Openings')).toBe('1. Openings');
    expect(lineText('> # - Draws')).toBe('- Draws');
  });

  test('keeps prose that only looks like a marker', ({ expect }) => {
    expect(lineText('-1 is negative')).toBe('-1 is negative');
    expect(lineText('#hashtag')).toBe('#hashtag');
  });
});
