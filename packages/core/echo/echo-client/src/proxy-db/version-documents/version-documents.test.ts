//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { isValidAutomergeUrl } from '@automerge/automerge-repo';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Filter, Lens, Obj, Query, Ref, Type } from '@dxos/echo';
import { DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { toDocumentId } from '../../automerge/index.ts';
import { createBranch, mergeBranch, switchBranch } from '../../echo-handler/index.ts';
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
  Lens.make(TaskV1, TaskV2, { name: 'title' }),
  Lens.make(TaskV2, TaskV3, { labels: 'tags' }, { defaults: { done: false } }),
];

/** Two holders of one task, written against different versions of it. */
const OldBoard = Type.makeObject(DXN.make('org.dxos.test.oldBoard', '0.1.0'))(
  Schema.Struct({ task: Ref.Ref(TaskV1), backlog: Schema.mutable(Schema.Array(Ref.Ref(TaskV1))) }),
);
const NewBoard = Type.makeObject(DXN.make('org.dxos.test.newBoard', '0.1.0'))(
  Schema.Struct({ task: Schema.optional(Ref.Ref(TaskV3)) }),
);

const types = [TaskV1, TaskV2, TaskV3, OldBoard, NewBoard];

/** The version document `db` records for `objectId` at `version`. */
const versionDoc = async (db: EchoDatabase, objectId: string, version: string) => {
  const url = DatabaseDirectory.getVersionDocUrls(db._getSpaceRootDocHandle().doc(), objectId)[version];
  invariant(url && isValidAutomergeUrl(url), `no document for ${version}`);
  const handle = db._repo.find<DatabaseDirectory>(url);
  await handle.whenReady();
  return handle;
};

/** The exact type URI, version included, of a live object. */
const typeOf = (object: Obj.Unknown): string | undefined => {
  const type = Obj.getType(object);
  return type && Type.getURI(type);
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

  test('a query returns each object once, at the newest version it names, so a limit is not short', async () => {
    const { db } = await builder.createDatabase({ types });
    const ids = ['one', 'two', 'three'].map((title) => db.add(Obj.make(TaskV1, { title, tags: [] })).id);
    await db.flush();
    await db.syncVersions(lenses);
    await db.flush({ indexes: true });

    const all = Filter.or(Filter.type(TaskV1), Filter.type(TaskV2), Filter.type(TaskV3));
    const limited = await db.query(Query.select(all).limit(3)).run();
    expect(limited.map((object) => object.id).sort()).toEqual([...ids].sort());
    expect(limited.map(typeOf)).toEqual([TaskV3, TaskV3, TaskV3].map((type) => Type.getURI(type)));
    const older = await db.query(Filter.or(Filter.type(TaskV1), Filter.type(TaskV2))).run();
    expect(older).toHaveLength(3);
    expect(older.map(typeOf)).toEqual([TaskV2, TaskV2, TaskV2].map((type) => Type.getURI(type)));
  });

  test('a query for an older version returns the object at that version', async () => {
    const { db } = await builder.createDatabase({ types });
    const { id } = db.add(Obj.make(TaskV1, { title: 'Plan', tags: ['a'] }));
    await db.flush();
    await db.syncVersions(lenses);
    await db.flush({ indexes: true });

    const olds = await db.query(Filter.type(TaskV1)).run();
    expect(olds).toHaveLength(1);
    const [old] = olds;
    expect(old.id).toBe(id);
    expect(typeOf(old)).toBe(Type.getURI(TaskV1));
    expect(old.title).toBe('Plan');
    const currents = await db.query(Filter.type(TaskV3)).run();
    expect(currents).toHaveLength(1);
    const [current] = currents;
    expect(current.name).toBe('Plan');
    // One object per version: the same query, and `db.version`, return the same instance.
    const [again] = await db.query(Filter.type(TaskV1)).run();
    expect(again).toBe(old);
    expect(await db.version(current, TaskV1)).toBe(old);
    expect(await db.version(current, TaskV3)).toBe(current);
    expect(await db.version(old, TaskV3)).toBe(current);

    // An edit at the older version reaches the object's live version.
    Obj.update(old, (old) => {
      old.tags.push('b');
    });
    await db.flush();
    await db.syncVersions(lenses);
    expect([...current.labels]).toEqual(['a', 'b']);
    expect([...old.tags]).toEqual(['a', 'b']);
  });

  test('a typed reference resolves to its target at the version the schema names', async () => {
    const { db } = await builder.createDatabase({ types });
    const task = db.add(Obj.make(TaskV1, { title: 'Plan', tags: [] }));
    const oldBoard = db.add(Obj.make(OldBoard, { task: Ref.make(task), backlog: [Ref.make(task)] }));
    await db.flush();
    await db.syncVersions(lenses);
    const current = await db.version(task, TaskV3);
    invariant(current, 'no v3 of the task');
    const newBoard = db.add(Obj.make(NewBoard, { task: Ref.make(current) }));
    await db.flush({ indexes: true });

    const viaOld = await oldBoard.task.load();
    expect(typeOf(viaOld)).toBe(Type.getURI(TaskV1));
    expect(viaOld.title).toBe('Plan');
    const [inBacklog] = await Promise.all(oldBoard.backlog.map((ref) => ref.load()));
    expect(inBacklog).toBe(viaOld);
    const viaNew = await newBoard.task?.load();
    expect(viaNew && typeOf(viaNew)).toBe(Type.getURI(TaskV3));
    expect(viaNew?.name).toBe('Plan');
    // Once loaded, `.target` reads the same objects synchronously.
    expect(oldBoard.task.target).toBe(viaOld);
    expect(newBoard.task?.target).toBe(viaNew);

    // A query that traverses the reference returns the version the reference declares.
    const fromOld = await db.query(Query.select(Filter.type(OldBoard)).reference('task')).run();
    expect(fromOld).toHaveLength(1);
    expect(fromOld[0]).toBe(viaOld);
    const fromNew = await db.query(Query.select(Filter.type(NewBoard)).reference('task')).run();
    expect(fromNew).toHaveLength(1);
    expect(fromNew[0]).toBe(viaNew);
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

  test('document heads cover every version and branch document', async () => {
    const { db } = await builder.createDatabase({ types });
    const { id } = db.add(Obj.make(TaskV1, { title: 'Plan', tags: [] }));
    await db.flush();
    await db.syncVersions(lenses);
    const [task] = await db.query(Filter.type(TaskV3)).run();
    await createBranch(task, 'b1');

    const root = db._getSpaceRootDocHandle().doc();
    const record = root.branches?.[id]?.b1;
    const urls = [
      ...Object.values(DatabaseDirectory.getVersionDocUrls(root, id)),
      ...Object.values(record?.members ?? {}).map(String),
      ...Object.values(record?.versions?.[id] ?? {}).map(String),
    ];
    expect(urls).toHaveLength(6);
    const heads = Object.keys((await db.getDocumentHeads()).heads);
    expect(heads).toEqual(expect.arrayContaining(urls.filter(isValidAutomergeUrl).map((url) => toDocumentId(url))));
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

describe('version documents on branches', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** The data of the object in a branch document of `version`. */
  const branchData = async (db: EchoDatabase, objectId: string, name: string, version: string) => {
    const record = db._getSpaceRootDocHandle().doc().branches?.[objectId]?.[name];
    const url =
      version === '0.1.0' ? record?.members[objectId]?.toString() : record?.versions?.[objectId]?.[version]?.toString();
    invariant(url && isValidAutomergeUrl(url), `no ${version} on ${name}`);
    const handle = db._repo.find<DatabaseDirectory>(url);
    await handle.whenReady();
    return dataOf(handle.doc(), objectId);
  };

  const mainData = async (db: EchoDatabase, objectId: string, version: string) =>
    dataOf((await versionDoc(db, objectId, version)).doc(), objectId);

  test('a branch forks every version, translates within itself and merges back version by version', async () => {
    const { db } = await builder.createDatabase({ types });
    const { id } = db.add(Obj.make(TaskV1, { title: 'Plan', tags: [] }));
    await db.flush();
    await db.syncVersions(lenses);
    const [task] = await db.query(Filter.type(TaskV3)).run();

    await createBranch(task, 'b1');
    const record = db._getSpaceRootDocHandle().doc().branches?.[id]?.b1;
    expect(Object.keys(record?.versions?.[id] ?? {}).sort()).toEqual(['0.2.0', '0.3.0']);

    await switchBranch(task, 'b1');
    expect(task.name).toBe('Plan');
    Obj.update(task, (task) => {
      task.labels.push('branch');
    });
    await db.flush();
    await db.syncVersions(lenses);
    expect((await branchData(db, id, 'b1', '0.1.0')).tags).toEqual(['branch']);
    expect((await mainData(db, id, '0.1.0')).tags).toEqual([]);

    await mergeBranch(task, 'b1');
    await db.syncVersions(lenses);
    expect((await mainData(db, id, '0.3.0')).labels).toEqual(['branch']);
    expect((await mainData(db, id, '0.1.0')).tags).toEqual(['branch']);
  });

  test('a branch opened before an upgrade gains the new versions and merges back once', async () => {
    const { db } = await builder.createDatabase({ types });
    const task = db.add(Obj.make(TaskV1, { title: 'Plan', tags: [] }));
    await db.flush();
    await createBranch(task, 'b1');
    await switchBranch(task, 'b1');
    Obj.update(task, (task) => {
      task.tags.push('branch');
    });
    await db.flush();

    await db.syncVersions(lenses);
    expect((await branchData(db, task.id, 'b1', '0.3.0')).labels).toEqual(['branch']);
    expect((await mainData(db, task.id, '0.3.0')).labels).toEqual([]);

    await mergeBranch(task, 'b1');
    await db.syncVersions(lenses);
    expect((await mainData(db, task.id, '0.1.0')).tags).toEqual(['branch']);
    expect((await mainData(db, task.id, '0.3.0')).labels).toEqual(['branch']);
  });
});
