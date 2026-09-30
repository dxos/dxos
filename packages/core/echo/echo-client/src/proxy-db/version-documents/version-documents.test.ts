//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import {
  type Data,
  Device,
  type VersionDoc,
  type VersionLens,
  isTranslation,
  settle,
  sync,
} from './version-documents.ts';

// v1 { title, tags } -> v2 renames `title` to `name` -> v3 renames `tags` to `labels` and adds `done`.
const v1v2: VersionLens = {
  id: 'v1v2',
  from: 1,
  to: 2,
  forward: ({ title, tags }) => ({ name: title, tags }),
  backward: ({ name, tags }) => ({ title: name, tags }),
};

const v2v3: VersionLens = {
  id: 'v2v3',
  from: 2,
  to: 3,
  forward: ({ name, tags }) => ({ name, labels: tags, done: false }),
  backward: ({ name, labels }) => ({ name, tags: labels }),
};

/** Another build of the v2 -> v3 lens that maps labels differently; the space never designates it. */
const v2v3Other: VersionLens = {
  ...v2v3,
  id: 'v2v3-other',
  backward: ({ name, labels }) => ({
    name,
    tags: Array.isArray(labels) ? labels.map((label) => String(label).toUpperCase()) : labels,
  }),
};

const designated = new Set(['v1v2', 'v2v3']);

const list = (doc: VersionDoc | undefined, key: string): unknown[] => {
  const value: unknown = doc?.data[key];
  return Array.isArray(value) ? [...value] : [];
};

const push = (device: Device, version: number, key: string, value: string): void => {
  const doc = device.docs.get(version);
  if (!doc) {
    throw new Error(`${device.name} holds no v${version}`);
  }
  device.docs.set(
    version,
    A.change(doc, (draft: { data: Data }) => {
      const items = draft.data[key];
      if (Array.isArray(items)) {
        items.push(value);
      }
    }),
  );
};

/** An old device holding v1, and two new devices holding v1+v3 and v1+v2+v3, all synced. */
const setup = () => {
  const old = new Device('old', []);
  const newA = new Device('newA', [v1v2, v2v3]);
  const newB = new Device('newB', [v1v2, v2v3]);
  old.docs.set(1, A.from<{ data: Data }>({ data: { title: 'Plan', tags: ['a'] } }));
  newA.docs.set(1, A.clone(docOf(old, 1)));
  newB.docs.set(1, A.clone(docOf(old, 1)));
  // An edit before the new devices upgrade, so each creates its version documents later than the origin.
  push(old, 1, 'tags', 'early');
  sync([old, newA, newB]);
  newA.createVersion(1, 3, designated);
  newB.createVersion(1, 2, designated);
  newB.createVersion(1, 3, designated);
  const devices = [old, newA, newB];
  settle(devices, designated);
  return { old, newA, newB, devices };
};

const docOf = (device: Device, version: number): VersionDoc => {
  const doc = device.docs.get(version);
  if (!doc) {
    throw new Error(`${device.name} holds no v${version}`);
  }
  return doc;
};

const headsOf = (doc: VersionDoc | undefined) => (doc ? A.getHeads(doc).sort().join() : '');

describe('version documents (prototype)', () => {
  test('devices that create a version document at different times create the same one', () => {
    const { newA, newB } = setup();
    expect(A.getChangesMetaSince(docOf(newA, 3), [])[0].hash).toBe(A.getChangesMetaSince(docOf(newB, 3), [])[0].hash);
    expect(list(newA.docs.get(3), 'labels')).toEqual(['a', 'early']);
  });

  test('concurrent edits in three versions reach every version once, and every copy converges', () => {
    const { old, newA, newB, devices } = setup();

    // Partitioned: each device edits the version it works in.
    push(old, 1, 'tags', 'old');
    push(newA, 3, 'labels', 'A');
    push(newB, 2, 'tags', 'B');
    for (const device of [newA, newB]) {
      device.translate(designated);
    }
    settle(devices, designated);

    for (const version of [1, 2, 3]) {
      const holders = devices.filter((device) => device.docs.has(version));
      expect(new Set(holders.map((device) => headsOf(device.docs.get(version)))).size).toBe(1);
    }
    expect(list(old.docs.get(1), 'tags').sort()).toEqual(['A', 'B', 'a', 'early', 'old']);
    expect(list(newB.docs.get(2), 'tags').sort()).toEqual(['A', 'B', 'a', 'early', 'old']);
    expect(list(newA.docs.get(3), 'labels').sort()).toEqual(['A', 'B', 'a', 'early', 'old']);
  });

  test('with v2 dropped everywhere, v1 and v3 still translate through the composed lens', () => {
    const { old, newA, newB, devices } = setup();
    newB.docs.delete(2);

    push(old, 1, 'tags', 'late');
    push(newA, 3, 'labels', 'late3');
    settle(devices, designated);

    expect(list(old.docs.get(1), 'tags').sort()).toEqual(['a', 'early', 'late', 'late3']);
    expect(list(newA.docs.get(3), 'labels').sort()).toEqual(['a', 'early', 'late', 'late3']);
    expect(headsOf(newA.docs.get(3))).toBe(headsOf(newB.docs.get(3)));
  });

  test('a device with an undesignated build of a lens does not translate with it', () => {
    const { old, newA, devices } = setup();
    const other = new Device('other', [v1v2, v2v3Other]);
    other.docs.set(1, A.clone(docOf(old, 1)));
    other.docs.set(3, A.clone(docOf(newA, 3)));
    const all = [...devices, other];

    push(other, 3, 'labels', 'x');
    settle(all, designated);

    // Only the designated build translated: no upper-cased duplicate reached v1.
    expect(list(old.docs.get(1), 'tags').sort()).toEqual(['a', 'early', 'x']);
  });

  test('translations are never translated back', () => {
    const { old, newA, devices } = setup();
    push(old, 1, 'tags', 'once');
    settle(devices, designated);
    settle(devices, designated);

    const translations = A.getChangesMetaSince(docOf(newA, 3), []).filter((change) => isTranslation(change.message));
    expect(list(newA.docs.get(3), 'labels').filter((label) => label === 'once')).toHaveLength(1);
    expect(list(old.docs.get(1), 'tags').filter((tag) => tag === 'once')).toHaveLength(1);
    expect(translations.length).toBeGreaterThan(0);
  });
  test('if two builds of one lens both translated, the same edit would arrive twice', () => {
    const { old, newA, devices } = setup();
    const other = new Device('other', [v1v2, v2v3Other]);
    other.docs.set(1, A.clone(docOf(old, 1)));
    other.docs.set(3, A.clone(docOf(newA, 3)));
    const all = [...devices, other];

    push(other, 3, 'labels', 'x');
    settle(all, new Set([...designated, v2v3Other.id]));

    // Why the space designates one build per version pair.
    expect(list(old.docs.get(1), 'tags').sort()).toEqual(['X', 'a', 'early', 'x']);
  });

  test('concurrent text edits in two versions merge in every version', () => {
    const { old, newA, devices } = setup();
    old.docs.set(
      1,
      A.change(docOf(old, 1), (draft: { data: Data }) => A.updateText(draft, ['data', 'title'], 'Plan A')),
    );
    newA.docs.set(
      3,
      A.change(docOf(newA, 3), (draft: { data: Data }) => A.updateText(draft, ['data', 'name'], 'The Plan')),
    );
    settle(devices, designated);

    expect(docOf(old, 1).data.title).toBe('The Plan A');
    expect(docOf(newA, 3).data.name).toBe('The Plan A');
  });
});

describe('version documents (prototype): six versions, two in use', () => {
  // v3 -> v4 renames `name` to `heading`; v4 -> v5 adds `priority`; v5 -> v6 renames `labels` to `topics`.
  const lenses: VersionLens[] = [
    v1v2,
    v2v3,
    {
      id: 'v3v4',
      from: 3,
      to: 4,
      forward: ({ name, ...rest }) => ({ heading: name, ...rest }),
      backward: ({ heading, ...rest }) => ({ name: heading, ...rest }),
    },
    {
      id: 'v4v5',
      from: 4,
      to: 5,
      forward: (data) => ({ ...data, priority: 0 }),
      backward: ({ priority: _priority, ...rest }) => rest,
    },
    {
      id: 'v5v6',
      from: 5,
      to: 6,
      forward: ({ labels, ...rest }) => ({ topics: labels, ...rest }),
      backward: ({ topics, ...rest }) => ({ labels: topics, ...rest }),
    },
  ];
  const allDesignated = new Set(lenses.map((lens) => lens.id));

  test('an old device on v1 and new devices on v6 translate through the composed chain, once per edit', () => {
    const old = new Device('old', []);
    const newA = new Device('newA', lenses);
    const newB = new Device('newB', lenses);
    old.docs.set(1, A.from<{ data: Data }>({ data: { title: 'Plan', tags: ['a'] } }));
    for (const device of [newA, newB]) {
      device.docs.set(1, A.clone(docOf(old, 1)));
      device.createVersion(1, 6, allDesignated);
    }
    const devices = [old, newA, newB];

    push(old, 1, 'tags', 'old');
    push(newA, 6, 'topics', 'A');
    push(newB, 6, 'topics', 'B');
    settle(devices, allDesignated);

    expect(list(docOf(old, 1), 'tags').sort()).toEqual(['A', 'B', 'a', 'old']);
    expect(list(docOf(newA, 6), 'topics').sort()).toEqual(['A', 'B', 'a', 'old']);
    expect(headsOf(newA.docs.get(6))).toBe(headsOf(newB.docs.get(6)));
    // One translation per original edit into each other document, whichever device wrote it.
    const translations = (doc: VersionDoc) =>
      A.getChangesMetaSince(doc, []).filter((change) => isTranslation(change.message)).length;
    expect(translations(docOf(old, 1))).toBe(2);
    expect(translations(docOf(newA, 6))).toBe(1);
  });
});
