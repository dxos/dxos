//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { parseSlide } from './parse.ts';
import { splitSlides } from './split.ts';

const load = (name: string) => readFileSync(new URL(`../../testing/${name}`, import.meta.url), 'utf8');

describe.each([
  { name: 'deck.md', slides: 11 },
  { name: '2025-05-20-effect.md', slides: 17 },
])('$name', ({ name, slides }) => {
  const parts = splitSlides(load(name));

  test('has the converted slide count', () => {
    expect(parts).toHaveLength(slides);
  });

  test('parses without issues', () => {
    expect(parts.flatMap((part) => parseSlide(part).issues)).toEqual([]);
  });

  test('keeps no reveal.js syntax', () => {
    expect(load(name)).not.toMatch(/\.slide:|\.element|data-background|data-visibility|<center|<img|style=/);
  });
});

describe('formatted frontmatter', () => {
  test('a blank line after the opening --- still yields frontmatter', () => {
    const parsed = parseSlide('---\n\nlayout: center\n---\n# T');
    expect(parsed.layout).toBe('center');
  });
});

describe('plugin-debug presenter sample', () => {
  const content = readFileSync(
    new URL('../../../plugin-debug/assets/presenter/presentation.md', import.meta.url),
    'utf8',
  ).replaceAll('{{timeline}}', 'echo:///01J00000000000000000000000');
  const parts = splitSlides(content);

  test('embeds the timeline chart as a surface', () => {
    const embedded = parts.map(parseSlide).filter((slide) => JSON.stringify(slide.slots).includes('slide-surface'));
    expect(embedded).toHaveLength(1);
  });

  test('parses without issues', () => {
    expect(parts.flatMap((part) => parseSlide(part).issues)).toEqual([]);
  });
});
