//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { frontmatterCompletion, layoutOptions } from './completion.ts';
import { FRONTMATTER_KEYS, LAYOUTS } from './frontmatter.ts';

/** Completes at the `|` marker. */
const complete = (marked: string) => frontmatterCompletion(marked.replace('|', ''), marked.indexOf('|'));

describe('frontmatterCompletion', () => {
  test('offers every layout after `layout:`', () => {
    const result = complete('---\nlayout: |\n---\n# Title');
    expect(result?.kind).toBe('value');
    expect(result?.options).toEqual(LAYOUTS);
    expect(result?.prefix).toBe('');
    expect(layoutOptions(result!)).toEqual(LAYOUTS);
  });

  test('filters by the value typed so far and replaces it', () => {
    const content = '---\nlayout: two|\n---\n';
    const result = complete(content);
    expect(result?.options).toEqual(['two-cols', 'two-cols-header', 'two-by-two']);
    expect(result?.from).toBe(content.indexOf('two'));
  });

  test('offers the values of every other key whose values are a fixed set', () => {
    expect(complete('---\nbackgroundFit: |\n---\n')?.options).toEqual(['cover', 'contain']);
    expect(complete('---\nbackgroundBlend: s|\n---\n')?.options).toEqual(['screen']);
    expect(complete('---\nbleed: |\n---\n')?.options).toEqual(['left', 'right']);
    expect(complete('---\nhide: |\n---\n')?.options).toEqual(['true', 'false']);
    expect(complete('---\nfooter: |\n---\n')?.options).toEqual(['true', 'false']);
    // A quoted value completes the same way, since the quote is not part of what is replaced.
    expect(complete('---\ntheme: "|\n---\n')?.options).toEqual(['default', 'light', 'dark', 'serif']);
  });

  test('offers the keys on a line of its own, each one once', () => {
    const result = complete('---\n|\n---\n');
    expect(result?.kind).toBe('key');
    expect(result?.options).toEqual(FRONTMATTER_KEYS);
    expect(layoutOptions(result!)).toBeUndefined();

    // Filtered by what is typed, and without the keys the block already carries.
    expect(complete('---\nbackgroundFit: contain\nbackground|\n---\n')?.options).toEqual([
      'background',
      'backgroundVideo',
      'backgroundOpacity',
      'backgroundPosition',
      'backgroundColor',
      'backgroundBlend',
    ]);
  });

  test('a completion replaces the rest of the word, and a key off the prototype offers nothing', () => {
    // Accepting `cover` at `co|ntain` must replace `contain`, not leave `coverntain` behind.
    const content = '---\nbackgroundFit: co|ntain\n---\n';
    const result = complete(content);
    expect(result?.options).toEqual(['cover', 'contain']);
    const stripped = content.replace('|', '');
    expect(stripped.slice(result!.from, result!.to)).toBe('contain');
    // `constructor` names a function on the prototype, which would pass a plain truthiness guard and then throw.
    expect(complete('---\nconstructor: |\n---\n')).toBeNull();
  });

  test('nothing outside the frontmatter, on a free-text value, or inside a key already written', () => {
    expect(complete('# Title\n\nlayout: |')).toBeNull();
    // `image` takes a URL, which no list can offer.
    expect(complete('---\nimage: |\n---\n')).toBeNull();
    // Completing here would leave `layoutout: cover`.
    expect(complete('---\nlay|out: cover\n---\n')).toBeNull();
    // The delimiter is part of the block, but it is not a key line.
    expect(complete('--|-\nlayout: cover\n---\n')).toBeNull();
  });
});
