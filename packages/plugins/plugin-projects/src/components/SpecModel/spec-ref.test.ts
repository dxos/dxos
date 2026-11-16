//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SpecIndex } from '@dxos/deus/spec-index';

import { resolveSpecRef } from './spec-ref.ts';

const INDEX: SpecIndex = {
  specs: {
    'org.test.alpha': { path: 'packages/alpha/PLUGIN.mdl', items: ['F-1', 'F-1.2', 'Scene'] },
  },
  duplicates: {
    'org.test.twice': ['a/SPEC.mdl', 'b/SPEC.mdl'],
  },
};

describe('resolveSpecRef', () => {
  test('resolves an id to a github key with the item as fragment', ({ expect }) => {
    expect(resolveSpecRef(INDEX, 'org.test.alpha', 'F-1.2')).toEqual({
      owner: 'dxos',
      repo: 'dxos',
      path: 'packages/alpha/PLUGIN.mdl',
      fragment: 'F-1.2',
    });
  });

  test('a bare id resolves to the spec with no fragment', ({ expect }) => {
    expect(resolveSpecRef(INDEX, 'org.test.alpha')).toEqual({
      owner: 'dxos',
      repo: 'dxos',
      path: 'packages/alpha/PLUGIN.mdl',
    });
  });

  test('an unknown item is an error naming it', ({ expect }) => {
    expect(resolveSpecRef(INDEX, 'org.test.alpha', 'F-9')).toEqual({ error: '`org.test.alpha` has no item `F-9`.' });
    expect(resolveSpecRef(INDEX, 'org.test.nope', 'F-1')).toEqual({ error: 'Unknown spec `org.test.nope`.' });
  });

  test('a duplicated id is an error', ({ expect }) => {
    expect(resolveSpecRef(INDEX, 'org.test.twice', 'F-1')).toEqual({
      error: 'Spec id `org.test.twice` is declared by more than one file.',
    });
  });
});
