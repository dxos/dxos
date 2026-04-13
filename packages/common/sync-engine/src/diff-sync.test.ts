//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { diffSync } from './diff-sync';

type Ext = { id: string; name: string; rev: number };
type Stored = { key: string; name: string; rev: number };

const externalId = (item: Ext) => item.id;
const storedExternalId = (item: Stored) => item.key;

describe('diffSync', () => {
  test('classifies creates, updates, unchanged, and removes', ({ expect }) => {
    const external: Ext[] = [
      { id: 'a', name: 'Alice', rev: 2 }, // existing, changed
      { id: 'b', name: 'Bob', rev: 1 },   // existing, unchanged
      { id: 'c', name: 'Cal', rev: 1 },   // new
    ];
    const stored: Stored[] = [
      { key: 'a', name: 'Alice', rev: 1 },
      { key: 'b', name: 'Bob', rev: 1 },
      { key: 'd', name: 'Dave', rev: 1 }, // gone
    ];

    const diff = diffSync<Ext, Stored>({
      external,
      stored,
      externalId,
      storedExternalId,
      equal: (ext, sto) => ext.rev === sto.rev,
    });

    expect(diff.toCreate.map((it) => it.id)).toEqual(['c']);
    expect(diff.toUpdate.map((it) => it.external.id)).toEqual(['a']);
    expect(diff.unchanged.map((it) => it.external.id)).toEqual(['b']);
    expect(diff.toRemove.map((it) => it.key)).toEqual(['d']);
  });

  test('without equal(), every match is treated as an update', ({ expect }) => {
    const diff = diffSync<Ext, Stored>({
      external: [{ id: 'a', name: 'A', rev: 1 }],
      stored: [{ key: 'a', name: 'A', rev: 1 }],
      externalId,
      storedExternalId,
    });
    expect(diff.toUpdate).toHaveLength(1);
    expect(diff.unchanged).toHaveLength(0);
  });

  test('ignores stored items whose externalId is undefined', ({ expect }) => {
    const diff = diffSync<Ext, Stored>({
      external: [{ id: 'a', name: 'A', rev: 1 }],
      stored: [
        { key: 'a', name: 'A', rev: 1 },
        { key: '', name: 'unrelated', rev: 0 },
      ],
      externalId,
      storedExternalId: (item) => (item.key === '' ? undefined : item.key),
    });
    expect(diff.toUpdate).toHaveLength(1);
    expect(diff.toRemove).toHaveLength(0);
  });

  test('empty external results in all stored being removed', ({ expect }) => {
    const diff = diffSync<Ext, Stored>({
      external: [],
      stored: [{ key: 'a', name: 'A', rev: 1 }],
      externalId,
      storedExternalId,
    });
    expect(diff.toRemove).toHaveLength(1);
    expect(diff.toCreate).toHaveLength(0);
  });

  test('empty stored results in all external being creates', ({ expect }) => {
    const diff = diffSync<Ext, Stored>({
      external: [{ id: 'a', name: 'A', rev: 1 }],
      stored: [],
      externalId,
      storedExternalId,
    });
    expect(diff.toCreate).toHaveLength(1);
    expect(diff.toRemove).toHaveLength(0);
  });
});
