//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Lens, Type } from '@dxos/echo';
import { type DatabaseDirectory, EncodedReference, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { creationChange, isTranslation } from './version-history.ts';
import { type VersionDoc, deriveVersionDoc, isDerived, translate, versionOfDoc } from './version-translation.ts';

const TYPENAME = 'org.dxos.test.task';
const OBJECT_ID = '01J00000000000000000000000';

const TaskV1 = Type.makeObject(DXN.make(TYPENAME, '0.1.0'))(
  Schema.Struct({ title: Schema.String, tags: Schema.Array(Schema.String) }),
);
const TaskV2 = Type.makeObject(DXN.make(TYPENAME, '0.2.0'))(
  Schema.Struct({ name: Schema.String, tags: Schema.Array(Schema.String) }),
);
const TaskV3 = Type.makeObject(DXN.make(TYPENAME, '0.3.0'))(
  Schema.Struct({ name: Schema.String, labels: Schema.Array(Schema.String), done: Schema.Boolean }),
);

const v1v2 = Lens.make(TaskV1, TaskV2, { name: 'title' });
const v2v3 = Lens.make(TaskV2, TaskV3, { labels: 'tags' }, { defaults: { done: false } });
const lenses = [v1v2, v2v3];

/** A document an app created the object in, as the entity manager does: the directory first, the object next. */
const createOrigin = (type: Type.AnyObj, data: Record<string, unknown>): VersionDoc => {
  const doc = A.change(A.init<DatabaseDirectory>(), (draft) => {
    draft.version = SpaceDocVersion.CURRENT;
    draft.access = { spaceKey: 'a1b2' };
  });
  return A.change(doc, (draft) => {
    draft.objects = {
      [OBJECT_ID]: {
        system: { kind: 'object', type: EncodedReference.fromURI(Type.getURI(type)) },
        meta: { keys: [] },
        data,
      },
    };
  });
};

/** One device: the version documents it holds, with the lenses it runs. */
class Device {
  readonly docs = new Map<string, VersionDoc>();
  readonly settled = new Set<string>();

  readonly edges: readonly Lens.VersionEdge[];

  constructor(
    readonly name: string,
    lenses: readonly Lens.Any[],
  ) {
    this.edges = lenses.map(Lens.versionEdge);
  }

  doc(version: string): VersionDoc {
    const doc = this.docs.get(version);
    invariant(doc, `${this.name} holds no ${version}`);
    return doc;
  }

  createVersion(version: string): void {
    const origin = [...this.docs.entries()].find(([, doc]) => !isDerived(doc));
    invariant(origin, `${this.name} holds no origin`);
    const [originVersion, originDoc] = origin;
    const derived = deriveVersionDoc({
      origin: originDoc,
      originVersion,
      version,
      objectId: OBJECT_ID,
      typename: TYPENAME,
      edges: this.edges,
    });
    invariant(derived, `${this.name} cannot derive ${version}`);
    this.docs.set(version, derived);
  }

  translate(): number {
    let written = 0;
    for (const [sourceVersion, sourceDoc] of this.docs) {
      for (const [targetVersion, targetDoc] of this.docs) {
        if (sourceVersion === targetVersion) {
          continue;
        }
        const next = translate({
          source: { doc: sourceDoc, version: sourceVersion },
          target: { doc: targetDoc, version: targetVersion },
          objectId: OBJECT_ID,
          typename: TYPENAME,
          edges: this.edges,
          settled: this.settled,
        });
        if (A.getHeads(next).join() !== A.getHeads(targetDoc).join()) {
          this.docs.set(targetVersion, next);
          written++;
        }
      }
    }
    return written;
  }

  edit(version: string, mutate: (data: Record<string, any>) => void): void {
    this.docs.set(
      version,
      A.change(this.doc(version), (draft) => mutate(draft.objects![OBJECT_ID].data)),
    );
  }
}

const sync = (devices: readonly Device[]): void => {
  for (const one of devices) {
    for (const two of devices) {
      for (const [version, doc] of one.docs) {
        const other = two.docs.get(version);
        if (one !== two && other) {
          two.docs.set(version, A.merge(other, doc));
        }
      }
    }
  }
};

const settle = (devices: readonly Device[]): void => {
  for (let round = 0; round < 10; round++) {
    sync(devices);
    if (devices.reduce((total, device) => total + device.translate(), 0) === 0) {
      return;
    }
  }
  throw new Error('version documents did not settle');
};

const dataOf = (doc: VersionDoc): Record<string, unknown> => JSON.parse(JSON.stringify(doc.objects![OBJECT_ID].data));

const sorted = (doc: VersionDoc, key: string): unknown[] => {
  const value = dataOf(doc)[key];
  return Array.isArray(value) ? [...value].sort() : [];
};

const headsOf = (doc: VersionDoc): string => [...A.getHeads(doc)].sort().join();

/** An old device holding v1, and two new devices holding v1+v3 and v1+v2+v3, all synced. */
const setup = () => {
  const old = new Device('old', []);
  const newA = new Device('newA', lenses);
  const newB = new Device('newB', lenses);
  old.docs.set('0.1.0', createOrigin(TaskV1, { title: 'Plan', tags: ['a'] }));
  for (const device of [newA, newB]) {
    device.docs.set('0.1.0', A.clone(old.doc('0.1.0')));
  }
  // An edit before the new devices upgrade, so each derives its version documents after it.
  old.edit('0.1.0', (data) => data.tags.push('early'));
  sync([old, newA, newB]);
  newA.createVersion('0.3.0');
  newB.createVersion('0.2.0');
  newB.createVersion('0.3.0');
  const devices = [old, newA, newB];
  settle(devices);
  return { old, newA, newB, devices };
};

describe('version translation', () => {
  test('the creation change and version of an app-created document', () => {
    const origin = createOrigin(TaskV1, { title: 'Plan', tags: [] });
    const [, second] = A.getChangesMetaSince(origin, []);
    expect(creationChange(origin, OBJECT_ID)?.hash).toBe(second.hash);
    expect(versionOfDoc(origin, OBJECT_ID, lenses.map(Lens.versionEdge))).toBe('0.1.0');
    expect(isDerived(origin)).toBe(false);
  });

  test('devices that derive a version document at different times derive the same root', () => {
    const { newA, newB } = setup();
    const rootOf = (doc: VersionDoc) => A.getChangesMetaSince(doc, [])[0].hash;
    expect(rootOf(newA.doc('0.3.0'))).toBe(rootOf(newB.doc('0.3.0')));
    expect(versionOfDoc(newA.doc('0.3.0'), OBJECT_ID, lenses.map(Lens.versionEdge))).toBe('0.3.0');
    expect(dataOf(newA.doc('0.3.0'))).toEqual({ name: 'Plan', labels: ['a', 'early'], done: false });
  });

  test('concurrent edits in three versions reach every version once, and every copy converges', () => {
    const { old, newA, newB, devices } = setup();
    old.edit('0.1.0', (data) => data.tags.push('old'));
    newA.edit('0.3.0', (data) => data.labels.push('A'));
    newB.edit('0.2.0', (data) => data.tags.push('B'));
    for (const device of [newA, newB]) {
      device.translate();
    }
    settle(devices);

    for (const version of ['0.1.0', '0.2.0', '0.3.0']) {
      const holders = devices.filter((device) => device.docs.has(version));
      expect(new Set(holders.map((device) => headsOf(device.doc(version)))).size).toBe(1);
    }
    const all = ['A', 'B', 'a', 'early', 'old'];
    expect(sorted(old.doc('0.1.0'), 'tags')).toEqual(all);
    expect(sorted(newB.doc('0.2.0'), 'tags')).toEqual(all);
    expect(sorted(newA.doc('0.3.0'), 'labels')).toEqual(all);
  });

  test('scalars and renamed properties translate both ways', () => {
    const { old, newA, devices } = setup();
    newA.edit('0.3.0', (data) => {
      data.name = 'Renamed';
      data.done = true;
    });
    settle(devices);
    expect(dataOf(old.doc('0.1.0')).title).toBe('Renamed');
    // v1 cannot hold `done`, so nothing moves there, and v3 keeps it.
    expect(dataOf(old.doc('0.1.0')).done).toBeUndefined();
    expect(dataOf(newA.doc('0.3.0')).done).toBe(true);
  });

  test('with v2 dropped, v1 and v3 still translate through the composed lenses', () => {
    const { old, newA, newB, devices } = setup();
    newB.docs.delete('0.2.0');
    old.edit('0.1.0', (data) => data.tags.push('late'));
    newA.edit('0.3.0', (data) => data.labels.push('late3'));
    settle(devices);

    expect(sorted(old.doc('0.1.0'), 'tags')).toEqual(['a', 'early', 'late', 'late3']);
    expect(sorted(newA.doc('0.3.0'), 'labels')).toEqual(['a', 'early', 'late', 'late3']);
    expect(headsOf(newA.doc('0.3.0'))).toBe(headsOf(newB.doc('0.3.0')));
  });

  test('a device whose lenses differ from those a document was derived with does not translate', () => {
    const { old, newA, devices } = setup();
    const otherV2V3 = Lens.make(TaskV2, TaskV3, { labels: 'tags' }, { defaults: { done: true } });
    const other = new Device('other', [v1v2, otherV2V3]);
    other.docs.set('0.1.0', A.clone(old.doc('0.1.0')));
    other.docs.set('0.3.0', A.clone(newA.doc('0.3.0')));
    other.edit('0.3.0', (data) => data.labels.push('x'));
    expect(other.translate()).toBe(0);

    settle([...devices, other]);
    // A designated device translated it instead.
    expect(sorted(old.doc('0.1.0'), 'tags')).toEqual(['a', 'early', 'x']);
  });

  test('an edit waits for the image of an ancestor that another version holds', () => {
    const old = new Device('old', []);
    const mid = new Device('mid', lenses);
    const top = new Device('top', lenses);
    const full = new Device('full', lenses);
    old.docs.set('0.1.0', createOrigin(TaskV1, { title: 'Plan', tags: [] }));
    for (const device of [mid, top, full]) {
      device.docs.set('0.1.0', A.clone(old.doc('0.1.0')));
    }
    mid.createVersion('0.2.0');
    top.createVersion('0.2.0');
    top.createVersion('0.3.0');
    full.createVersion('0.3.0');
    // `top` holds v2 and v3 only, so it never sees the v1 edit its v2 edit builds on.
    top.docs.delete('0.1.0');

    old.edit('0.1.0', (data) => data.tags.push('e1'));
    sync([old, mid]);
    mid.translate();
    mid.edit('0.2.0', (data) => data.tags.push('e2'));
    sync([mid, top]);
    expect(top.translate()).toBe(0);

    const devices = [old, mid, top, full];
    settle(devices);
    for (const device of [top, full]) {
      expect(sorted(device.doc('0.3.0'), 'labels')).toEqual(['e1', 'e2']);
    }
    expect(headsOf(top.doc('0.3.0'))).toBe(headsOf(full.doc('0.3.0')));
  });

  test('translations are never translated back', () => {
    const { old, newA, devices } = setup();
    old.edit('0.1.0', (data) => data.tags.push('once'));
    settle(devices);
    settle(devices);

    expect(sorted(newA.doc('0.3.0'), 'labels').filter((label) => label === 'once')).toHaveLength(1);
    expect(sorted(old.doc('0.1.0'), 'tags').filter((tag) => tag === 'once')).toHaveLength(1);
    const translations = A.getChangesMetaSince(newA.doc('0.3.0'), []).filter((change) => isTranslation(change.message));
    expect(translations.length).toBeGreaterThan(0);
  });

  test('concurrent text edits in two versions merge in every version', () => {
    const { old, newA, devices } = setup();
    old.docs.set(
      '0.1.0',
      A.change(old.doc('0.1.0'), (draft) => A.updateText(draft, ['objects', OBJECT_ID, 'data', 'title'], 'Plan A')),
    );
    newA.docs.set(
      '0.3.0',
      A.change(newA.doc('0.3.0'), (draft) => A.updateText(draft, ['objects', OBJECT_ID, 'data', 'name'], 'The Plan')),
    );
    settle(devices);

    expect(dataOf(old.doc('0.1.0')).title).toBe('The Plan A');
    expect(dataOf(newA.doc('0.3.0')).name).toBe('The Plan A');
  });

  test('meta and deletion translate unchanged', () => {
    const { old, newA, devices } = setup();
    newA.docs.set(
      '0.3.0',
      A.change(newA.doc('0.3.0'), (draft) => {
        const entry = draft.objects![OBJECT_ID];
        entry.meta.tags = ['pinned'];
        entry.system!.deleted = true;
      }),
    );
    settle(devices);
    const entry = old.doc('0.1.0').objects![OBJECT_ID];
    expect(JSON.parse(JSON.stringify(entry.meta.tags))).toEqual(['pinned']);
    expect(entry.system?.deleted).toBe(true);
    expect(entry.system?.type).toEqual(EncodedReference.fromURI(Type.getURI(TaskV1)));
  });

  test('an object an app created at the newest version reaches older versions', () => {
    const newA = new Device('newA', lenses);
    const newB = new Device('newB', lenses);
    newA.docs.set('0.3.0', createOrigin(TaskV3, { name: 'Fresh', labels: [], done: true }));
    newB.docs.set('0.3.0', A.clone(newA.doc('0.3.0')));
    newA.createVersion('0.1.0');
    newB.createVersion('0.1.0');
    newB.edit('0.1.0', (data) => data.tags.push('from-old'));
    settle([newA, newB]);

    expect(dataOf(newA.doc('0.1.0'))).toEqual({ title: 'Fresh', tags: ['from-old'] });
    expect(dataOf(newA.doc('0.3.0'))).toEqual({ name: 'Fresh', labels: ['from-old'], done: true });
  });
});

describe('version translation: six versions, two in use', () => {
  const TaskV4 = Type.makeObject(DXN.make(TYPENAME, '0.4.0'))(
    Schema.Struct({ heading: Schema.String, labels: Schema.Array(Schema.String), done: Schema.Boolean }),
  );
  const TaskV5 = Type.makeObject(DXN.make(TYPENAME, '0.5.0'))(
    Schema.Struct({
      heading: Schema.String,
      labels: Schema.Array(Schema.String),
      done: Schema.Boolean,
      priority: Schema.Number.annotate({ default: 0 }),
    }),
  );
  const TaskV6 = Type.makeObject(DXN.make(TYPENAME, '0.6.0'))(
    Schema.Struct({
      heading: Schema.String,
      topics: Schema.Array(Schema.String),
      done: Schema.Boolean,
      priority: Schema.Number,
    }),
  );
  const chain = [
    v1v2,
    v2v3,
    Lens.make(TaskV3, TaskV4, { heading: 'name' }),
    Lens.make(TaskV4, TaskV5),
    Lens.make(TaskV5, TaskV6, { topics: 'labels' }),
  ];

  test('an old device on v1 and new devices on v6 translate through the composed chain, once per edit', () => {
    const old = new Device('old', []);
    const newA = new Device('newA', chain);
    const newB = new Device('newB', chain);
    old.docs.set('0.1.0', createOrigin(TaskV1, { title: 'Plan', tags: ['a'] }));
    for (const device of [newA, newB]) {
      device.docs.set('0.1.0', A.clone(old.doc('0.1.0')));
      device.createVersion('0.6.0');
    }
    const devices = [old, newA, newB];

    old.edit('0.1.0', (data) => data.tags.push('old'));
    newA.edit('0.6.0', (data) => data.topics.push('A'));
    newB.edit('0.6.0', (data) => data.topics.push('B'));
    settle(devices);

    expect(sorted(old.doc('0.1.0'), 'tags')).toEqual(['A', 'B', 'a', 'old']);
    expect(sorted(newA.doc('0.6.0'), 'topics')).toEqual(['A', 'B', 'a', 'old']);
    expect(headsOf(newA.doc('0.6.0'))).toBe(headsOf(newB.doc('0.6.0')));
    const translations = (doc: VersionDoc) =>
      A.getChangesMetaSince(doc, []).filter((change) => isTranslation(change.message)).length;
    expect(translations(old.doc('0.1.0'))).toBe(2);
    expect(translations(newA.doc('0.6.0'))).toBe(1);
  });
});
