//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LAYOUTS, parseFrontmatter } from './frontmatter.ts';

describe('parseFrontmatter', () => {
  test('maps known keys and drops unknown ones', () => {
    const { frontmatter, issues } = parseFrontmatter(
      'layout: cover\nimage: a.png\nbackgroundOpacity: 0.5\nbackgroundVideo: v.mp4\nunknown: 1',
    );
    expect(frontmatter).toEqual({
      layout: 'cover',
      image: 'a.png',
      backgroundOpacity: 0.5,
      backgroundVideo: 'v.mp4',
    });
    expect(issues).toEqual([]);
  });

  test('bleed takes a side; anything else is reported and dropped', () => {
    expect(parseFrontmatter('bleed: right').frontmatter).toEqual({ bleed: 'right' });
    const { frontmatter, issues } = parseFrontmatter('bleed: top');
    expect(frontmatter).toEqual({});
    expect(issues).toHaveLength(1);
  });

  test('rejects out-of-range and non-numeric opacity', () => {
    for (const source of ["backgroundOpacity: '0.5'", 'backgroundOpacity: 2']) {
      const { frontmatter, issues } = parseFrontmatter(source);
      expect(frontmatter).toEqual({});
      expect(issues).toHaveLength(1);
      expect(issues[0].kind).toBe('frontmatter');
    }
  });

  test('malformed yaml yields an issue and empty frontmatter', () => {
    const { frontmatter, issues } = parseFrontmatter('layout: [cover\n  : :');
    expect(frontmatter).toEqual({});
    expect(issues.map((issue) => issue.kind)).toEqual(['frontmatter']);
  });

  test('keeps valid fields beside an invalid one', () => {
    const { frontmatter, issues } = parseFrontmatter('layout: cover\nbackgroundOpacity: 2');
    expect(frontmatter).toEqual({ layout: 'cover' });
    expect(issues).toHaveLength(1);
  });

  test('keeps the theme name', () => {
    expect(parseFrontmatter('theme: dark').frontmatter).toEqual({ theme: 'dark' });
  });

  test('empty input is valid', () => {
    expect(parseFrontmatter('')).toEqual({ frontmatter: {}, issues: [] });
  });

  test('lists 18 layouts', () => {
    expect(LAYOUTS).toHaveLength(18);
  });
});
