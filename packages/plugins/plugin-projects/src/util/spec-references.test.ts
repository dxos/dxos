//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { nestSpecs, specLineage } from './spec-references.ts';

describe('spec-references', () => {
  test('a spec nests under every spec citing it, by object id or front-matter id', () => {
    const { roots, children } = nestSpecs([
      { id: 'a', cites: ['c'] },
      { id: 'b', cites: ['org.example.c', 'missing'] },
      { id: 'c', specId: 'org.example.c', cites: [] },
    ]);
    expect(roots).toEqual(['a', 'b']);
    expect(children.get('a')).toEqual(['c']);
    expect(children.get('b')).toEqual(['c']);
    expect(specLineage({ roots, children }, 'c')).toEqual(['a', 'c']);
  });

  test('a spec only a cycle reaches becomes a root', () => {
    const { roots, children } = nestSpecs([
      { id: 'a', cites: [] },
      { id: 'b', cites: ['c', 'b'] },
      { id: 'c', cites: ['b'] },
    ]);
    expect(roots).toEqual(['a', 'b']);
    expect(children.get('b')).toEqual(['c']);
    expect(children.get('c')).toEqual(['b']);
  });
});
