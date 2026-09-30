//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { isValidAutomergeUrl } from '@automerge/automerge-repo';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Filter, Obj, Type, VersionLens } from '@dxos/echo';
import { DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder } from '../../testing/index.ts';
import { type EchoDatabase } from '../database.ts';

const TYPENAME = 'org.dxos.test.versionedTask';

const TaskV1 = Type.makeObject(DXN.make(TYPENAME, '0.1.0'))(
  Schema.Struct({ title: Schema.String, tags: Schema.mutable(Schema.Array(Schema.String)) }),
);
const TaskV2 = Type.makeObject(DXN.make(TYPENAME, '0.2.0'))(
  Schema.Struct({ name: Schema.String, tags: Schema.mutable(Schema.Array(Schema.String)) }),
);
const TaskV3 = Type.makeObject(DXN.make(TYPENAME, '0.3.0'))(
  Schema.Struct({ name: Schema.String, labels: Schema.mutable(Schema.Array(Schema.String)), done: Schema.Boolean }),
);

const lenses = [
  VersionLens.make({ from: TaskV1, to: TaskV2, ops: [VersionLens.rename('title', 'name')] }),
  VersionLens.make({
    from: TaskV2,
    to: TaskV3,
    ops: [VersionLens.rename('tags', 'labels'), VersionLens.add('done', false)],
  }),
];

const types = [TaskV1, TaskV2, TaskV3];

/** The version document `db` records for `objectId` at `version`. */
const versionDoc = async (db: EchoDatabase, objectId: string, version: string) => {
  const url = DatabaseDirectory.getVersionDocUrls(db._getSpaceRootDocHandle().doc(), objectId)[version];
  invariant(url && isValidAutomergeUrl(url), `no document for ${version}`);
  const handle = db._repo.find<DatabaseDirectory>(url);
  await handle.whenReady();
  return handle;
};

const dataOf = (doc: DatabaseDirectory, objectId: string): Record<string, unknown> =>
  JSON.parse(JSON.stringify(doc.objects?.[objectId]?.data ?? {}));

describe('version documents', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('every version is created up front, recorded as a reserved branch, and kept in sync', async () => {
    const { db } = await builder.createDatabase({ types });
    const task = db.add(Obj.make(TaskV1, { title: 'Plan', tags: ['a'] }));
    await db.flush();
    const legacyUrl = db._getSpaceRootDocHandle().doc().links?.[task.id]?.toString();

    await db.syncVersions(lenses);
    const urls = DatabaseDirectory.getVersionDocUrls(db._getSpaceRootDocHandle().doc(), task.id);
    expect(Object.keys(urls).sort()).toEqual(['0.1.0', '0.2.0', '0.3.0']);
    // The link still names the document released apps read, and the registry lists it too.
    expect(db._getSpaceRootDocHandle().doc().links?.[task.id]?.toString()).toBe(legacyUrl);
    expect(urls['0.1.0']).toBe(legacyUrl);
    expect(db.listBranches(task.id)).toEqual(['main']);

    const v1 = await versionDoc(db, task.id, '0.1.0');
    const v2 = await versionDoc(db, task.id, '0.2.0');
    const v3 = await versionDoc(db, task.id, '0.3.0');
    expect(dataOf(v3.doc(), task.id)).toEqual({ name: 'Plan', labels: ['a'], done: false });

    // An edit in the legacy version reaches the newer ones, and one in a newer version reaches back.
    v1.change((doc) => {
      doc.objects![task.id].data.tags.push('b');
    });
    await db.syncVersions(lenses);
    expect(dataOf(v3.doc(), task.id).labels).toEqual(['a', 'b']);

    v3.change((doc) => {
      A.updateText(doc, ['objects', task.id, 'data', 'name'], 'Plan B');
    });
    await db.syncVersions(lenses);
    expect(dataOf(v1.doc(), task.id)).toEqual({ title: 'Plan B', tags: ['a', 'b'] });
    expect(dataOf(v2.doc(), task.id)).toEqual({ name: 'Plan B', tags: ['a', 'b'] });
  });

  test('an object reads at the newest version the client knows, and a query returns it once', async () => {
    const { db } = await builder.createDatabase({ types });
    const { id } = db.add(Obj.make(TaskV1, { title: 'Plan', tags: ['a'] }));
    await db.flush();
    await db.syncVersions(lenses);
    await db.flush();

    const results = await db.query(Filter.or(Filter.type(TaskV1), Filter.type(TaskV2), Filter.type(TaskV3))).run();
    expect(results.map((object) => object.id)).toEqual([id]);
    const [task] = await db.query(Filter.type(TaskV3)).run();
    expect(task.name).toBe('Plan');
    expect(task.labels).toEqual(['a']);

    // Edits through the object land in v3 and reach the document released apps read.
    Obj.update(task, (task) => {
      task.labels.push('b');
      task.done = true;
    });
    await db.flush();
    await db.syncVersions(lenses);
    const v1 = await versionDoc(db, id, '0.1.0');
    expect(dataOf(v1.doc(), id)).toEqual({ title: 'Plan', tags: ['a', 'b'] });
    // A translation written into v1 does not pull the object back onto it.
    await db.flush();
    const type = Obj.getType(task);
    invariant(type, 'object has no type');
    expect(Type.getURI(type)).toBe(Type.getURI(TaskV3));
    expect(task.labels).toEqual(['a', 'b']);
  });

  test('an object created at a newer version is linked at the oldest, which released apps read', async () => {
    const { db } = await builder.createDatabase({ types });
    const task = db.add(Obj.make(TaskV3, { name: 'Fresh', labels: [], done: false }));
    await db.flush();
    await db.syncVersions(lenses);
    await db.flush();

    const root = db._getSpaceRootDocHandle().doc();
    const urls = DatabaseDirectory.getVersionDocUrls(root, task.id);
    expect(root.links?.[task.id]?.toString()).toBe(urls['0.1.0']);
    const v1 = await versionDoc(db, task.id, '0.1.0');
    expect(dataOf(v1.doc(), task.id)).toEqual({ title: 'Fresh', tags: [] });
    // This client still reads it at v3.
    expect(task.name).toBe('Fresh');
    const [found] = await db.query(Filter.type(TaskV3)).run();
    expect(found.id).toBe(task.id);
  });

  test('a second pass writes nothing', async () => {
    const { db } = await builder.createDatabase({ types });
    const task = db.add(Obj.make(TaskV1, { title: 'Plan', tags: [] }));
    await db.flush();
    await db.syncVersions(lenses);
    // Changes the runner authors: roots and translations. The repo's own initial change of an imported
    // document can arrive from the worker at any time, so heads alone do not show what a pass wrote.
    const authored = async () =>
      (
        await Promise.all(
          ['0.1.0', '0.2.0', '0.3.0'].map(async (version) =>
            A.getChangesMetaSince((await versionDoc(db, task.id, version)).doc(), [])
              .filter(({ message }) => message !== null)
              .map(({ hash }) => hash),
          ),
        )
      ).flat();
    const before = await authored();
    const rootHeads = A.getHeads(db._getSpaceRootDocHandle().doc()).join();
    await db.syncVersions(lenses);
    expect(await authored()).toEqual(before);
    expect(A.getHeads(db._getSpaceRootDocHandle().doc()).join()).toBe(rootHeads);
  });

  test('watchVersions creates versions, routes the object and translates as it changes', async () => {
    const { db } = await builder.createDatabase({ types });
    const { id } = db.add(Obj.make(TaskV1, { title: 'Plan', tags: [] }));
    await db.flush();
    const unwatch = db.watchVersions(() => lenses, { debounceMs: 10 });
    try {
      await waitForCondition({
        condition: async () => (await db.query(Filter.type(TaskV3)).run()).length === 1,
        timeout: 5_000,
      });
      const [task] = await db.query(Filter.type(TaskV3)).run();
      Obj.update(task, (task) => {
        task.labels.push('watched');
      });
      const v1 = await versionDoc(db, id, '0.1.0');
      await waitForCondition({
        condition: () => JSON.stringify(dataOf(v1.doc(), id).tags) === '["watched"]',
        timeout: 5_000,
      });
    } finally {
      unwatch();
    }
  });
});
