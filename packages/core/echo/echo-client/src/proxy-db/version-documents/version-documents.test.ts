//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Obj, Type, VersionLens } from '@dxos/echo';
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
  invariant(url, `no document for ${version}`);
  const handle = db._repo.find<DatabaseDirectory>(url as DocumentId);
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

    await db.syncVersions(lenses);
    const urls = DatabaseDirectory.getVersionDocUrls(db._getSpaceRootDocHandle().doc(), task.id);
    expect(Object.keys(urls).sort()).toEqual(['0.2.0', '0.3.0']);
    // The object's link still names the document released apps read.
    expect(db._getSpaceRootDocHandle().doc().links?.[task.id]).toBeDefined();
    expect(db.listBranches(task.id)).toEqual(['main']);

    const v3 = await versionDoc(db, task.id, '0.3.0');
    expect(dataOf(v3.doc(), task.id)).toEqual({ name: 'Plan', labels: ['a'], done: false });

    // An edit in the legacy version reaches the newer ones, and one in a newer version reaches back.
    Obj.update(task, (task) => {
      task.tags.push('b');
    });
    await db.flush();
    await db.syncVersions(lenses);
    expect(dataOf(v3.doc(), task.id).labels).toEqual(['a', 'b']);

    v3.change((doc) => {
      A.updateText(doc, ['objects', task.id, 'data', 'name'], 'Plan B');
    });
    await db.syncVersions(lenses);
    expect(task.title).toBe('Plan B');
    const v2 = await versionDoc(db, task.id, '0.2.0');
    expect(dataOf(v2.doc(), task.id)).toEqual({ name: 'Plan B', tags: ['a', 'b'] });
  });

  test('a second pass writes nothing', async () => {
    const { db } = await builder.createDatabase({ types });
    const task = db.add(Obj.make(TaskV1, { title: 'Plan', tags: [] }));
    await db.flush();
    await db.syncVersions(lenses);
    const heads = async () =>
      (await Promise.all(['0.2.0', '0.3.0'].map((version) => versionDoc(db, task.id, version)))).map((handle) =>
        A.getHeads(handle.doc()).join(),
      );
    const before = await heads();
    const rootHeads = A.getHeads(db._getSpaceRootDocHandle().doc()).join();
    await db.syncVersions(lenses);
    expect(await heads()).toEqual(before);
    expect(A.getHeads(db._getSpaceRootDocHandle().doc()).join()).toBe(rootHeads);
  });

  test('watchVersions translates as objects change', async () => {
    const { db } = await builder.createDatabase({ types });
    const task = db.add(Obj.make(TaskV1, { title: 'Plan', tags: [] }));
    await db.flush();
    const unwatch = db.watchVersions(() => lenses, { debounceMs: 10 });
    try {
      await waitForCondition({
        condition: () =>
          DatabaseDirectory.getVersionDocUrls(db._getSpaceRootDocHandle().doc(), task.id)['0.3.0'] != null,
        timeout: 5_000,
      });
      const v3 = await versionDoc(db, task.id, '0.3.0');
      Obj.update(task, (task) => {
        task.tags.push('watched');
      });
      await waitForCondition({
        condition: () => JSON.stringify(dataOf(v3.doc(), task.id).labels) === '["watched"]',
        timeout: 5_000,
      });
    } finally {
      unwatch();
    }
  });
});
