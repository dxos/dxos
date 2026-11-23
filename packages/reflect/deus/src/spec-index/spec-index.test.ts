//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { indexSpecs, isIndexedSpec } from './spec-index.ts';

const spec = (id: string | undefined) =>
  [
    ...(id ? ['---', `id: ${id}`, '---', ''] : []),
    '# Spec',
    '',
    '```mdl',
    'type Foo',
    '```',
    '',
    '```mdl',
    'feat F-1: A feature',
    '  req F-1.1: First requirement.',
    '```',
    '',
  ].join('\n');

describe('indexSpecs', () => {
  test('indexes a spec by its frontmatter id with its block and req ids', ({ expect }) => {
    const index = indexSpecs([{ path: 'a/SPEC.mdl', text: spec('org.example.a') }]);
    expect(index.specs['org.example.a'].path).toBe('a/SPEC.mdl');
    expect(index.specs['org.example.a'].items).toEqual(expect.arrayContaining(['Foo', 'F-1', 'F-1.1']));
    expect(index.duplicates).toEqual({});
  });

  test('reports a duplicated id on every path and does not resolve it', ({ expect }) => {
    const index = indexSpecs([
      { path: 'a/SPEC.mdl', text: spec('org.example.a') },
      { path: 'b/SPEC.mdl', text: spec('org.example.a') },
    ]);
    expect(index.specs['org.example.a']).toBeUndefined();
    expect(index.duplicates['org.example.a']).toEqual(['a/SPEC.mdl', 'b/SPEC.mdl']);
  });

  test('skips a file with no frontmatter id', ({ expect }) => {
    const index = indexSpecs([{ path: 'a/SPEC.mdl', text: spec(undefined) }]);
    expect(index).toEqual({ specs: {}, duplicates: {} });
  });
});

describe('isIndexedSpec', () => {
  test('keeps specs and dialects, leaves out reviews, fixtures and lang examples', ({ expect }) => {
    expect(isIndexedSpec('packages/plugins/plugin-code/PLUGIN.mdl')).toBe(true);
    expect(isIndexedSpec('packages/reflect/deus/lang/core.mdl')).toBe(true);
    expect(isIndexedSpec('packages/plugins/plugin-code/PLUGIN.review.mdl')).toBe(false);
    expect(isIndexedSpec('packages/reflect/deus/src/cli/__fixtures__/SPEC.mdl')).toBe(false);
    expect(isIndexedSpec('packages/reflect/deus/lang/examples/chess-1.mdl')).toBe(false);
  });
});
