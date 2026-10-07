//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { iconSymbolPattern } from './symbol-pattern.ts';

// The composer / storybook configuration: Phosphor at every weight, the custom sets at `regular`.
const pattern = iconSymbolPattern({ sets: ['ph', 'dx', 'px'], regularOnly: ['dx', 'px'] });

/** First match, or undefined — mirrors how `@ch-ui/icons` scans (unanchored, global). */
const scan = (content: string) => content.match(new RegExp(pattern, 'gm'))?.[0];

describe('iconSymbolPattern', () => {
  test.for([
    ['ph--house--regular', 'ph--house--regular'],
    ['ph--house--bold', 'ph--house--bold'],
    ['ph--house--duotone', 'ph--house--duotone'],
    ['ph--github-logo--regular', 'ph--github-logo--regular'],
    ['dx--dxos--regular', 'dx--dxos--regular'],
    ['px--anthropic--regular', 'px--anthropic--regular'],
    ["icon='ph--house--regular'", 'ph--house--regular'],
    ['url(#ph--house--regular)', 'ph--house--regular'],
  ] as const)('matches %s', ([content, expected]) => {
    expect(scan(content)).toEqual(expected);
  });

  test.for([
    // Single-weight sets carry no variants.
    'dx--dxos--bold',
    'px--anthropic--fill',
    // A name assembled at runtime is not a literal the scanner can resolve.
    '`${set}--house--regular`',
    // Digits are not part of an icon name.
    'ph--house2--regular',
  ] as const)('does not match %s', (content) => {
    expect(scan(content)).toBeUndefined();
  });

  describe('boundaries', () => {
    test.for([
      // A set name that is the tail of a preceding token. `4px` is the one that shows up for real:
      // `px` is also a CSS unit, and stylesheets are scanned.
      'margin: 4px--foo--regular',
      'MYph--house--regular',
      '_ph--house--regular',
      'foo-ph--house--regular',
      // A longer word that merely starts with a weight.
      'ph--house--regularized',
      'ph--house--bolder',
    ] as const)('rejects %s', (content) => {
      expect(scan(content)).toBeUndefined();
    });

    test('rejects the set-suffix leak the single-weight lookahead would otherwise open', () => {
      // Declining `dx--x--bold` at position 0 makes the engine retry at position 1, where `x--…`
      // must not be read as a set of its own.
      expect(scan('dx--x--bold')).toBeUndefined();
      expect(iconSymbolPattern({ sets: ['ph', 'dx', 'x'], regularOnly: ['dx'] })).toBeDefined();
      expect(
        'dx--foo--bold'.match(new RegExp(iconSymbolPattern({ sets: ['ph', 'dx', 'x'], regularOnly: ['dx'] }), 'gm')),
      ).toBeNull();
    });
  });

  test('omits the single-weight lookahead when every set carries all weights', () => {
    const all = iconSymbolPattern({ sets: ['ph'] });
    // The trailing boundary is also a negative lookahead, so match on the weight alternation.
    expect(all).not.toContain('--(?:bold');
    expect('ph--house--bold'.match(new RegExp(all))?.[0]).toEqual('ph--house--bold');
  });

  test('exposes the capture groups `assetPath` is called with', () => {
    expect('px--anthropic--regular'.match(new RegExp(pattern))?.slice(1)).toEqual(['px', 'anthropic', 'regular']);
  });
});
