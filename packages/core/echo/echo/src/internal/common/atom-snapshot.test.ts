//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { URI } from '@dxos/keys';

import { RefImpl } from '../Ref/ref.ts';
import { snapshotEquals, snapshotForComparison } from './atom-snapshot.ts';

const makeRef = (uri: string) => new RefImpl(URI.make(uri));

describe('snapshotEquals', () => {
  test('an array holding a record always compares unequal', ({ expect }) => {
    // The snapshot shallow-copies the array, so a record element mutated in place is the same
    // reference on both sides: comparing it by identity would report no change and the atom would
    // never notify. Records therefore compare unequal whether or not they were touched.
    const value = [{ ids: ['a'] }];
    const snapshot = snapshotForComparison(value);
    expect(snapshotEquals(value, snapshot)).toBe(false);

    value[0].ids.push('b');
    expect(snapshotEquals(value, snapshot)).toBe(false);
  });

  test('an array of scalars compares by content', ({ expect }) => {
    const value = ['a', 'b'];
    const snapshot = snapshotForComparison(value);
    expect(snapshotEquals(value, snapshot)).toBe(true);
    expect(snapshotEquals(['a', 'c'], snapshot)).toBe(false);
    expect(snapshotEquals(['a'], snapshot)).toBe(false);
  });
});

describe('snapshotForComparison', () => {
  test('a ref survives the snapshot with its uri intact', ({ expect }) => {
    // `RefImpl.uri` is a prototype getter over a `#private` field, so a shallow spread would drop it
    // and hand the consumer an empty object — which is what froze the chat's model selector.
    const ref = makeRef('dxn:model:com.anthropic:claude');
    expect(snapshotForComparison(ref).uri).toBe(ref.uri);
  });

  test('a ref field compares by uri', ({ expect }) => {
    const snapshot = snapshotForComparison(makeRef('dxn:model:a'));
    expect(snapshotEquals(makeRef('dxn:model:a'), snapshot)).toBe(true);
    expect(snapshotEquals(makeRef('dxn:model:b'), snapshot)).toBe(false);
    expect(snapshotEquals(undefined, snapshot)).toBe(false);
  });

  test('a ref field also compares by its inlined target', ({ expect }) => {
    // `{'/': uri}` and `{'/': uri, target}` are different encoded values, so a URI-only comparison
    // would report no change and leave the consumer holding the stale inline target.
    const target = { id: 'x' } as any;
    const inlined = new RefImpl(URI.make('dxn:echo:@:x'), target);
    expect(snapshotEquals(inlined, snapshotForComparison(inlined.noInline()))).toBe(false);
    expect(snapshotEquals(inlined.noInline(), snapshotForComparison(inlined))).toBe(false);
    expect(snapshotEquals(new RefImpl(URI.make('dxn:echo:@:x'), target), snapshotForComparison(inlined))).toBe(true);
  });
});
