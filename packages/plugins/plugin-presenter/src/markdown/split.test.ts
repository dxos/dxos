//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { splitSlides } from './split.ts';

describe('splitSlides', () => {
  test('splits on ---', () => {
    expect(splitSlides('# One\n\n---\n\n# Two')).toEqual(['# One', '# Two']);
  });

  test('keeps per-slide frontmatter with its slide', () => {
    expect(splitSlides('# One\n---\nlayout: cover\n---\n# Two')).toEqual(['# One', '---\nlayout: cover\n---\n# Two']);
  });

  test('keeps headmatter with the first slide', () => {
    expect(splitSlides('---\ntitle: Deck\n---\n# One\n---\n# Two')).toEqual(['---\ntitle: Deck\n---\n# One', '# Two']);
  });

  test('ignores --- inside fenced code', () => {
    const backticks = '```md\n---\nlayout: x\n---\n```';
    expect(splitSlides(`${backticks}\n---\n# Two`)).toEqual([backticks, '# Two']);
    const tildes = '~~~\n---\n~~~';
    expect(splitSlides(`${tildes}\n---\n# Two`)).toEqual([tildes, '# Two']);
  });

  test('longer fences close only with an equal or longer fence', () => {
    const fenced = '````\n```\n---\n```\n````';
    expect(splitSlides(`${fenced}\n---\nnext`)).toEqual([fenced, 'next']);
  });

  test('keeps a body-less frontmatter-only slide', () => {
    expect(splitSlides('---\nlayout: a\n---\n---\nlayout: b\n---\nbody')).toEqual([
      '---\nlayout: a\n---',
      '---\nlayout: b\n---\nbody',
    ]);
  });

  test('a single-line yaml block after a separator is frontmatter', () => {
    expect(splitSlides('one\n---\nNote: x\n---\ntwo')).toEqual(['one', '---\nNote: x\n---\ntwo']);
  });

  test('a key line followed by prose is body, not frontmatter', () => {
    expect(splitSlides('one\n---\nNote: x\nsome prose\n---\ntwo')).toEqual(['one', 'Note: x\nsome prose', 'two']);
  });

  test('a blank line before the first key is still frontmatter', () => {
    expect(splitSlides('---\n\nlayout: center\n---\n# T')).toEqual(['---\n\nlayout: center\n---\n# T']);
  });

  test('a blank line before a key followed by prose is body', () => {
    expect(splitSlides('one\n---\n\nNote: x\nsome prose\n---\ntwo')).toEqual(['one', 'Note: x\nsome prose', 'two']);
  });

  test('empty document', () => {
    expect(splitSlides('')).toEqual(['']);
  });
});
