//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { shareStructure } from './share-structure.ts';

describe('shareStructure', () => {
  test('keeps the previous subtree wherever it equals the next one', () => {
    const previous = {
      title: 'a',
      tags: ['x', 'y'],
      nested: { count: 1, bytes: new Uint8Array([1, 2]), body: new A.RawString('long') },
      owner: { '/': 'echo:///01' },
    };
    const next = {
      title: 'b',
      tags: ['x', 'y'],
      nested: { count: 1, bytes: new Uint8Array([1, 2]), body: new A.RawString('long') },
      owner: { '/': 'echo:///01' },
    };

    const shared = shareStructure(previous, next);
    expect(shared).toEqual(next);
    expect(shared).not.toBe(previous);
    expect(shared.tags).toBe(previous.tags);
    expect(shared.nested).toBe(previous.nested);
    expect(shared.owner).toBe(previous.owner);
  });

  test('returns the previous value when nothing changed, and the new one where a key appeared or left', () => {
    const previous = { a: 1, list: [1, 2, 3] };
    expect(shareStructure(previous, { a: 1, list: [1, 2, 3] })).toBe(previous);

    const added = shareStructure(previous, { a: 1, list: [1, 2, 3], b: 2 });
    expect(added).not.toBe(previous);
    expect(added.list).toBe(previous.list);

    const shortened = shareStructure(previous, { a: 1, list: [1, 2] });
    expect(shortened.list).toEqual([1, 2]);
    expect(shortened.list).not.toBe(previous.list);
  });
});
