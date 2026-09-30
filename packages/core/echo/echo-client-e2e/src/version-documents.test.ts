//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Filter, Obj, Type, VersionLens } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { DatabaseDirectory } from '@dxos/echo-protocol';
import { DXN, PublicKey } from '@dxos/keys';

import { type TestDatabase, createPartitionedPair } from './migration-bench/harness.ts';

//
// Version documents across peers (`.agents/projects/lenses/DESIGN.md` §12.5): peers that create an
// object's version documents while partitioned hold two documents per version; once they sync, the
// registry's visible value names the winner, every holder of a loser merges it in, and both peers end
// on one document per version holding both peers' edits.
//

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

const versionUrl = (db: TestDatabase, objectId: string, version: string): string | undefined =>
  DatabaseDirectory.getVersionDocUrls(db._getSpaceRootDocHandle().doc(), objectId)[version];

type DocumentUrl = Extract<Parameters<TestDatabase['_repo']['find']>[0], string>;

const isDocumentUrl = (url: string): url is DocumentUrl => url.startsWith('automerge:');

const versionDoc = async (db: TestDatabase, objectId: string, version: string) => {
  const url = versionUrl(db, objectId, version);
  if (!url || !isDocumentUrl(url)) {
    throw new Error(`no document for ${version}`);
  }
  const handle = db._repo.find<DatabaseDirectory>(url);
  await handle.whenReady();
  return handle;
};

const labelsOf = (doc: DatabaseDirectory, objectId: string): string[] => {
  const labels: unknown = JSON.parse(JSON.stringify(doc.objects?.[objectId]?.data?.labels ?? []));
  return Array.isArray(labels) ? labels.map(String).sort() : [];
};

describe('version documents across peers', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('peers that create version documents concurrently converge on one per version', async () => {
    const pair = await createPartitionedPair(builder, [TaskV1, TaskV2, TaskV3]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;
    const spaceKey = PublicKey.random();
    const db1 = await peer1.createDatabase(spaceKey);
    const task = db1.add(Obj.make(TaskV1, { title: 'Plan', tags: [] }));
    await db1.flush();
    const db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await syncAll(db1, db2);

    // Partitioned: each peer creates its own version documents and edits in its v3.
    await partition();
    await db1.syncVersions(lenses);
    await db2.syncVersions(lenses);
    expect(versionUrl(db1, task.id, '0.3.0')).not.toBe(versionUrl(db2, task.id, '0.3.0'));
    (await versionDoc(db1, task.id, '0.3.0')).change((doc) => {
      doc.objects![task.id].data.labels.push('one');
    });
    (await versionDoc(db2, task.id, '0.3.0')).change((doc) => {
      doc.objects![task.id].data.labels.push('two');
    });
    await db1.syncVersions(lenses);
    await db2.syncVersions(lenses);

    await heal();
    await waitForCondition({
      condition: async () => {
        await db1.syncVersions(lenses);
        await db2.syncVersions(lenses);
        const urls = ['0.2.0', '0.3.0'].map((version) => [
          versionUrl(db1, task.id, version),
          versionUrl(db2, task.id, version),
        ]);
        if (urls.some(([one, two]) => !one || one !== two)) {
          return false;
        }
        const [one, two] = await Promise.all([versionDoc(db1, task.id, '0.3.0'), versionDoc(db2, task.id, '0.3.0')]);
        return (
          A.getHeads(one.doc()).sort().join() === A.getHeads(two.doc()).sort().join() &&
          labelsOf(one.doc(), task.id).join() === 'one,two'
        );
      },
      interval: 200,
      timeout: 20_000,
    });

    // Both edits reached the legacy version too, on both peers, once each.
    for (const db of [db1, db2]) {
      const v1 = await versionDoc(db, task.id, '0.1.0');
      await waitForCondition({
        condition: () => JSON.stringify(v1.doc().objects?.[task.id]?.data?.tags ?? []).includes('two'),
        timeout: 5_000,
      });
      expect(JSON.parse(JSON.stringify(v1.doc().objects?.[task.id]?.data?.tags)).sort()).toEqual(['one', 'two']);
    }
  });

  test('an old peer reads the version it knows and its edits reach a new peer', async () => {
    const pair = await createPartitionedPair(builder, [TaskV1, TaskV2, TaskV3]);
    network = pair.network;
    const { peer1, peer2, syncAll } = pair;
    const spaceKey = PublicKey.random();
    // `fresh` runs the lenses; `old` never does, as an app released before version documents.
    const fresh = await peer1.createDatabase(spaceKey);
    const created = fresh.add(Obj.make(TaskV3, { name: 'Fresh', labels: ['new'], done: true }));
    await fresh.flush();
    await fresh.syncVersions(lenses);
    await fresh.flush();
    const old = await peer2.openDatabase(spaceKey, fresh.rootUrl!);
    await syncAll(fresh, old);

    const [seen] = await old.query(Filter.type(TaskV1)).run();
    expect(seen.id).toBe(created.id);
    expect(seen.title).toBe('Fresh');
    expect([...seen.tags]).toEqual(['new']);
    expect(await old.query(Filter.type(TaskV3)).run()).toHaveLength(0);

    Obj.update(seen, (seen) => {
      seen.tags.push('old');
    });
    await old.flush();
    await waitForCondition({
      condition: async () => {
        await fresh.syncVersions(lenses);
        return [...created.labels].sort().join() === 'new,old';
      },
      interval: 200,
      timeout: 10_000,
    });
    // `done` exists only in v3 and survives the old peer's edit.
    expect(created.done).toBe(true);
  });
});
