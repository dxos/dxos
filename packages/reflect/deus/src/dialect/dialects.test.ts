//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { declarationsOf } from './declarations.ts';
import { DIALECTS, dialectTexts, extendsOf } from './dialects.ts';

describe('dialectTexts', () => {
  test('a dialect comes after the dialects it extends, each once', ({ expect }) => {
    const known = new Map([
      ['a', '---\nid: a\n---\n'],
      ['b', '---\nid: b\nextends:\n  - a\n---\n'],
      ['c', '---\nid: c\nextends:\n  - a\n  - b\n---\n'],
    ]);
    expect(dialectTexts(['c', 'missing'], known).map((text) => extendsOf(text).length)).toEqual([0, 1, 2]);
  });

  test('every bundled dialect is found by its id', ({ expect }) => {
    expect(dialectTexts([...DIALECTS.keys()])).toHaveLength(DIALECTS.size);
    expect(declarationsOf(dialectTexts(['org.dxos.spec.video'])).get('shot')).toEqual({
      role: 'structure',
      links: { assets: 'aggregates', scene: 'part-of' },
    });
  });
});
