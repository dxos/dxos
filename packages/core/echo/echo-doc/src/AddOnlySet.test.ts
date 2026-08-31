//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, test } from 'vitest';

import * as AddOnlySet from './AddOnlySet';

type TestDoc = { credentials: AddOnlySet.Entries };

const PATH = ['credentials'];

const empty = (): A.Doc<TestDoc> => A.from<TestDoc>({ credentials: {} });

const withEntries = (doc: A.Doc<TestDoc>, entries: [string, number[]][]): A.Doc<TestDoc> =>
  A.change(doc, (draft) => {
    for (const [key, value] of entries) {
      AddOnlySet.add(draft.credentials, key, new Uint8Array(value));
    }
  });

const readKeys = (doc: A.Doc<TestDoc>): string[] => [...AddOnlySet.read(doc, PATH).keys()].sort();

describe('AddOnlySet', () => {
  test('reads back what was added', ({ expect }) => {
    const doc = withEntries(empty(), [
      ['alice', [1, 2, 3]],
      ['bob', [4, 5]],
    ]);

    const entries = AddOnlySet.read(doc, PATH);
    expect([...entries.keys()].sort()).to.deep.equal(['alice', 'bob']);
    expect(entries.get('alice')).to.deep.equal(new Uint8Array([1, 2, 3]));
    expect(entries.get('bob')).to.deep.equal(new Uint8Array([4, 5]));
  });

  test('a deleted entry survives, which is the point', ({ expect }) => {
    let doc = withEntries(empty(), [
      ['alice', [1, 2, 3]],
      ['bob', [4, 5]],
    ]);

    // A peer with write access revokes another member by deleting their credential.
    doc = A.change(doc, (draft) => {
      delete draft.credentials.alice;
    });

    expect(Object.keys(doc.credentials)).to.deep.equal(['bob']);
    expect(readKeys(doc)).to.deep.equal(['alice', 'bob']);
    expect(AddOnlySet.read(doc, PATH).get('alice')).to.deep.equal(new Uint8Array([1, 2, 3]));
  });

  test('deleting every entry, or the set itself, still reads back', ({ expect }) => {
    let doc = withEntries(empty(), [
      ['alice', [1]],
      ['bob', [2]],
    ]);

    doc = A.change(doc, (draft) => {
      delete draft.credentials.alice;
      delete draft.credentials.bob;
    });
    expect(readKeys(doc)).to.deep.equal(['alice', 'bob']);

    // The set object itself is gone from the current state, so the path cannot be resolved against it.
    doc = A.change(doc, (draft) => {
      delete (draft as Partial<TestDoc>).credentials;
    });
    expect(doc.credentials).to.be.undefined;
    expect(readKeys(doc)).to.deep.equal(['alice', 'bob']);
  });

  test('deleting the set and recreating it keeps both incarnations', ({ expect }) => {
    let doc = withEntries(empty(), [['alice', [1]]]);

    // The recreated map is a different automerge object, so the entries added before the delete are
    // only found if every incarnation of the path is tracked.
    doc = A.change(doc, (draft) => {
      delete (draft as Partial<TestDoc>).credentials;
    });
    doc = A.change(doc, (draft) => {
      draft.credentials = {};
    });
    doc = withEntries(doc, [['bob', [2]]]);

    expect(readKeys(doc)).to.deep.equal(['alice', 'bob']);
  });

  test('an overwrite cannot displace an entry', ({ expect }) => {
    let doc = withEntries(empty(), [['alice', [1, 2, 3]]]);

    // `add` is a no-op on an existing key, and a raw assignment is defeated by first-write-wins.
    doc = withEntries(doc, [['alice', [9, 9, 9]]]);
    doc = A.change(doc, (draft) => {
      draft.credentials.alice = new Uint8Array([7, 7, 7]);
    });

    expect(AddOnlySet.read(doc, PATH).get('alice')).to.deep.equal(new Uint8Array([1, 2, 3]));
  });

  test('a concurrent add from another peer merges rather than clobbers', ({ expect }) => {
    const base = withEntries(empty(), [['alice', [1]]]);

    let left = A.clone(base);
    let right = A.clone(base);
    left = withEntries(left, [['bob', [2]]]);
    right = withEntries(right, [['carol', [3]]]);

    // Right also deletes what left cannot see, so the merge carries a delete alongside a concurrent add.
    right = A.change(right, (draft) => {
      delete draft.credentials.alice;
    });

    const merged = A.merge(left, right);
    expect(readKeys(merged)).to.deep.equal(['alice', 'bob', 'carol']);
  });

  test('entries under a nested path are found, and a same-named set elsewhere is not', ({ expect }) => {
    type Nested = { space: { credentials: AddOnlySet.Entries }; credentials: AddOnlySet.Entries };
    let doc = A.from<Nested>({ space: { credentials: {} }, credentials: {} });
    doc = A.change(doc, (draft) => {
      AddOnlySet.add(draft.space.credentials, 'nested', new Uint8Array([1]));
      AddOnlySet.add(draft.credentials, 'toplevel', new Uint8Array([2]));
    });

    expect([...AddOnlySet.read(doc, ['space', 'credentials']).keys()]).to.deep.equal(['nested']);
    expect([...AddOnlySet.read(doc, ['credentials']).keys()]).to.deep.equal(['toplevel']);
  });

  test('a path holding no set reads empty rather than throwing', ({ expect }) => {
    const doc = withEntries(empty(), [['alice', [1]]]);
    expect(AddOnlySet.read(doc, ['nope']).size).to.equal(0);
    expect(() => AddOnlySet.read(doc, [])).to.throw();
  });
});
