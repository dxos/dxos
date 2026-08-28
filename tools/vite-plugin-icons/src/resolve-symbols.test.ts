//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type AssetStat, resolveSymbols } from './resolve-symbols.ts';

describe('resolveSymbols', () => {
  test('resolves a symbol whose asset exists', () => {
    const { resolved, missing } = resolve(['px--circle--regular'], { '/assets/px/regular/circle.svg': stat() });
    expect(resolved).toEqual([{ symbol: 'px--circle--regular', path: '/assets/px/regular/circle.svg' }]);
    expect(missing).toEqual([]);
  });

  test('reports a symbol with no asset instead of resolving it', () => {
    const { resolved, missing } = resolve(['ph--github--regular'], {});
    expect(resolved).toEqual([]);
    expect(missing).toEqual([{ symbol: 'ph--github--regular', path: '/assets/ph/regular/github.svg' }]);
  });

  test('keeps the good symbols when one is missing', () => {
    const { resolved, missing } = resolve(['px--circle--regular', 'ph--github--regular', 'px--a--bold'], {
      '/assets/px/regular/circle.svg': stat(),
      '/assets/px/bold/a.svg': stat(),
    });
    expect(resolved.map(({ symbol }) => symbol)).toEqual(['px--circle--regular', 'px--a--bold']);
    expect(missing.map(({ symbol }) => symbol)).toEqual(['ph--github--regular']);
  });

  test('skips a name the pattern cannot parse', () => {
    const { resolved, missing } = resolve(['not-an-icon'], {});
    expect(resolved).toEqual([]);
    expect(missing).toEqual([]);
  });

  describe('fingerprint', () => {
    test('is stable across iteration order', () => {
      const files = { '/assets/px/regular/a.svg': stat(), '/assets/px/regular/b.svg': stat(2, 200) };
      const first = resolve(['px--a--regular', 'px--b--regular'], files).fingerprint;
      const second = resolve(['px--b--regular', 'px--a--regular'], files).fingerprint;
      expect(second).toEqual(first);
    });

    test('changes when an asset is redrawn, though the symbol set is identical', () => {
      const before = resolve(['px--a--regular'], { '/assets/px/regular/a.svg': stat(1, 100) }).fingerprint;
      const after = resolve(['px--a--regular'], { '/assets/px/regular/a.svg': stat(2, 140) }).fingerprint;
      expect(after).not.toEqual(before);
    });

    test('changes when a symbol is added', () => {
      const files = { '/assets/px/regular/a.svg': stat(), '/assets/px/regular/b.svg': stat() };
      const before = resolve(['px--a--regular'], files).fingerprint;
      const after = resolve(['px--a--regular', 'px--b--regular'], files).fingerprint;
      expect(after).not.toEqual(before);
    });

    test('ignores a missing symbol, so a typo does not force a rewrite every pass', () => {
      const files = { '/assets/px/regular/a.svg': stat() };
      expect(resolve(['px--a--regular', 'ph--github--regular'], files).fingerprint).toEqual(
        resolve(['px--a--regular'], files).fingerprint,
      );
    });
  });
});

const symbolPattern = '(ph|px)--([a-z]+[a-z-]*)--(bold|regular)';

const assetPath = (iconSet: string, name: string, variant: string) => `/assets/${iconSet}/${variant}/${name}.svg`;

const resolve = (symbols: string[], files: Record<string, AssetStat>) =>
  resolveSymbols({ symbols, symbolPattern, assetPath, stat: (path) => files[path] });

const stat = (mtimeMs = 1, size = 100): AssetStat => ({ mtimeMs, size });
