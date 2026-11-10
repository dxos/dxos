//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import {
  type DocumentId,
  generateAutomergeUrl,
  isValidAutomergeUrl,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { Filter, Obj, Ref } from '@dxos/echo';
import { getObjectCore } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { type EchoHost } from '@dxos/echo-host';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import {
  type DatabaseDirectory,
  type EntityStructure,
  SpaceDocVersion,
  createIdFromSpaceKey,
} from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';

const TYPES = [TestSchema.Task, TestSchema.Person];

const readDirectory = async (host: EchoHost, url: string): Promise<DatabaseDirectory> => {
  invariant(isValidAutomergeUrl(url), `Not a document url: ${url}`);
  using lease = await host.loadDoc<DatabaseDirectory>(Context.default(), url);
  invariant(lease, `Document is not loadable: ${url}`);
  return A.toJS(lease.doc());
};

/** The state of each object as its own document stores it. */
const readStructures = async (host: EchoHost, rootUrl: string): Promise<Record<string, EntityStructure>> => {
  const root = await readDirectory(host, rootUrl);
  const structures: Record<string, EntityStructure> = {};
  for (const [objectId, link] of Object.entries(root.links ?? {})) {
    const structure = (await readDirectory(host, String(link))).objects?.[objectId];
    invariant(structure, `Linked document does not hold ${objectId}`);
    structures[objectId] = structure;
  }
  return structures;
};

/** A space directory as clients that predate linked-only directories wrote it: every object inline in the root. */
const legacyDirectory = (
  spaceId: SpaceId,
  spaceKey: PublicKey,
  objects: Record<string, EntityStructure>,
): A.Doc<DatabaseDirectory> =>
  A.change(A.init<DatabaseDirectory>(), (draft) =>
    Object.assign(draft, {
      version: SpaceDocVersion.CURRENT,
      access: { spaceId, spaceKey: spaceKey.toHex() },
      objects,
      links: {},
    }),
  );

/** Stores `directory` on the peer's host under `documentId`, as replication from an older peer would. */
const storeDirectory = async (peer: EchoTestPeer, documentId: DocumentId, directory: A.Doc<DatabaseDirectory>) => {
  using root = await peer.host.createDoc<DatabaseDirectory>(A.clone(directory), {
    preserveHistory: true,
    documentId,
  });
  await peer.host.flush(Context.default());
  return root.url;
};

const randomDocumentId = (): DocumentId => parseAutomergeUrl(generateAutomergeUrl()).documentId;

describe('inline space root objects', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Objects created through the API on a scratch peer, and their stored state, to inline in a legacy directory. */
  const createFixture = async () => {
    await using peer = await builder.createPeer({ types: TYPES });
    await using db = await peer.createDatabase();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    const task = db.add(Obj.make(TestSchema.Task, { title: 'Write tests', assignee: Ref.make(person) }));
    await db.flush();
    invariant(db.rootUrl);
    return { personId: person.id, taskId: task.id, structures: await readStructures(peer.host, db.rootUrl) };
  };

  test('new objects always get a document of their own', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: TYPES });
    await using db = await peer.createDatabase();
    const objects = [
      db.add(Obj.make(TestSchema.Person, { name: 'Alice' })),
      db.add(Obj.make(TestSchema.Task, { title: 'One' })),
      db.add(Obj.make(TestSchema.Task, { title: 'Two' })),
    ];
    await db.flush();

    invariant(db.rootUrl);
    const root = await readDirectory(peer.host, db.rootUrl);
    expect(Object.keys(root.objects ?? {})).toEqual([]);
    expect(Object.keys(root.links ?? {}).sort()).toEqual(objects.map((object) => object.id).sort());
  });

  test('opening a space migrates its inline objects, keeping ids, data and references', async ({ expect }) => {
    const { personId, taskId, structures } = await createFixture();
    await using peer = await builder.createPeer({ types: TYPES });
    const spaceKey = PublicKey.random();
    const spaceId = await createIdFromSpaceKey(spaceKey);
    const rootUrl = await storeDirectory(peer, randomDocumentId(), legacyDirectory(spaceId, spaceKey, structures));

    await using db = await peer.openDatabase(spaceKey, rootUrl);
    await peer.host.migrateInlineObjects(spaceId);

    const root = await readDirectory(peer.host, rootUrl);
    expect(root.objects).toEqual({});
    expect(Object.keys(root.links ?? {}).sort()).toEqual([personId, taskId].sort());
    // Each object's stored state, system fields included, moved unchanged.
    expect(await readStructures(peer.host, rootUrl)).toEqual(structures);

    await waitForCondition({ condition: () => db.getObjectById(taskId) != null, timeout: 5_000 });
    const task = db.getObjectById<TestSchema.Task>(taskId);
    invariant(task);
    expect(task.title).toBe('Write tests');
    const assignee = await task.assignee?.load();
    expect(assignee?.id).toBe(personId);
    expect(assignee?.name).toBe('Alice');
    expect((await db.query(Filter.type(TestSchema.Task)).run()).map((object) => object.id)).toEqual([taskId]);
  });

  test('an open object moved out of the directory keeps working', async ({ expect }) => {
    const { taskId, structures } = await createFixture();
    await using peer = await builder.createPeer({ types: TYPES });
    await using db = await peer.createDatabase();
    invariant(db.rootUrl);
    const rootUrl = db.rootUrl;
    invariant(isValidAutomergeUrl(rootUrl));

    // An older peer writes an object inline while this client has the space open.
    {
      using root = await peer.host.loadDoc<DatabaseDirectory>(Context.default(), rootUrl);
      invariant(root);
      root.change((draft: DatabaseDirectory) => {
        draft.objects ??= {};
        draft.objects[taskId] = structures[taskId];
      });
    }
    await waitForCondition({ condition: () => db.getObjectById(taskId) != null, timeout: 5_000 });
    const task = db.getObjectById<TestSchema.Task>(taskId);
    invariant(task);
    expect(getObjectCore(task).handle?.url).toBe(rootUrl);

    await peer.host.migrateInlineObjects(db.spaceId);

    // The same object, now bound to its own document.
    await waitForCondition({
      condition: () => {
        const url = getObjectCore(task).handle?.url;
        return url != null && url !== rootUrl;
      },
      timeout: 5_000,
    });
    expect(db.getObjectById(taskId)).toBe(task);
    expect(task.title).toBe('Write tests');
    Obj.update(task, (task) => {
      task.title = 'Edited after the move';
    });
    await db.flush();
    expect((await readStructures(peer.host, rootUrl))[taskId].data.title).toBe('Edited after the move');
    expect((await readDirectory(peer.host, rootUrl)).objects).toEqual({});
  });

  test('two peers migrating the same directory concurrently converge without duplicates', async ({ expect }) => {
    const { personId, taskId, structures } = await createFixture();
    const spaceKey = PublicKey.random();
    const spaceId = await createIdFromSpaceKey(spaceKey);
    const rootId = randomDocumentId();
    const directory = legacyDirectory(spaceId, spaceKey, structures);

    // Opened first so it closes last: peers tear their replicators down against it.
    await using network = await new TestReplicationNetwork().open();
    // Each peer opens the same legacy directory and migrates it before seeing the other.
    await using peer1 = await builder.createPeer({ types: TYPES });
    await using peer2 = await builder.createPeer({ types: TYPES });
    const rootUrl = await storeDirectory(peer1, rootId, directory);
    await storeDirectory(peer2, rootId, directory);
    await using db1 = await peer1.openDatabase(spaceKey, rootUrl);
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await peer1.host.migrateInlineObjects(spaceId);
    await peer2.host.migrateInlineObjects(spaceId);

    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());

    const root1 = await readDirectory(peer1.host, rootUrl);
    const root2 = await readDirectory(peer2.host, rootUrl);
    expect(root1.objects).toEqual({});
    expect(root2.objects).toEqual({});
    expect(root1.links).toEqual(root2.links);
    expect(Object.keys(root1.links ?? {}).sort()).toEqual([personId, taskId].sort());
    expect(await readStructures(peer1.host, rootUrl)).toEqual(structures);
    expect(await readStructures(peer2.host, rootUrl)).toEqual(structures);

    for (const db of [db1, db2]) {
      const tasks = await db.query(Filter.type(TestSchema.Task)).run();
      expect(tasks.map((task) => task.id)).toEqual([taskId]);
    }
  });
});
