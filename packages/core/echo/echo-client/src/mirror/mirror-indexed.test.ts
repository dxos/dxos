//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import * as AutomergeOps from '@dxos/automerge-proxy/AutomergeOps';
import * as Op from '@dxos/automerge-proxy/Op';
import * as Repo from '@dxos/automerge-proxy/Repo';
import { Context } from '@dxos/context';
import { type Entity, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { QueryReactivity } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { type QueryService } from '@dxos/protocols/rpc';

import { getObjectCore } from '../echo-handler/index.ts';
import { type DatabaseImpl } from '../proxy-db/index.ts';
import { EchoTestBuilder, type EchoTestPeer } from '../testing/index.ts';
import { MirrorDocHandle } from './mirror-doc-handle.ts';
import { MirrorRepo } from './mirror-repo.ts';

/** Paths at which two JSON trees differ, with both values. */
const differences = (left: unknown, right: unknown, path: string[] = []): string[] => {
  if (Op.isContainer(left) && Op.isContainer(right) && Array.isArray(left) === Array.isArray(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].flatMap((key) => differences(Reflect.get(left, key), Reflect.get(right, key), [...path, key]));
  }
  return Op.equals(left, right)
    ? []
    : [`${path.join('.')}: index ${JSON.stringify(left)}, worker ${JSON.stringify(right)}`];
};

/** Reading objects from the worker's index, with the worker loading a document only once a tab writes to it. */
describe('objects read from the index', () => {
  let builder: EchoTestBuilder;
  let peer: EchoTestPeer;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    peer = await builder.createPeer({
      types: [TestSchema.Person, TestSchema.Task, TestSchema.HasManager],
      queryExecutor: 'sql',
    });
  });

  afterEach(async () => {
    await builder.close();
  });

  const handleOf = (obj: Entity.Unknown): MirrorDocHandle<unknown> => {
    const handle = getObjectCore(obj).docHandle;
    invariant(handle instanceof MirrorDocHandle, 'not a mirror document');
    return handle;
  };

  const documentOf = (obj: Entity.Unknown): DocumentId => {
    const documentId = handleOf(obj).documentId;
    invariant(documentId, 'object has no document');
    return documentId;
  };

  /** The worker's Automerge copy of an object's data. */
  const hostData = async (obj: Obj.Unknown) => hostDataAt(documentOf(obj), obj.id);

  const hostDataAt = async (documentId: DocumentId, objectId: string) => {
    using lease = await peer.host.automergeHost.loadDoc(Context.default(), documentId);
    return Op.getAt(AutomergeOps.toValue(lease?.doc()), ['objects', objectId, 'data']);
  };

  /** Which of the documents the worker holds in memory. */
  const residentOf = (documentIds: readonly DocumentId[]) => {
    const resident = new Set(peer.host.automergeHost.loadedDocumentIds);
    return documentIds.filter((documentId) => resident.has(documentId));
  };

  const load = async (db: DatabaseImpl, id: string) => {
    const obj = await db._loadObjectById(id);
    invariant(Obj.instanceOf(TestSchema.Expando, obj), `object ${id} did not load`);
    return obj;
  };

  const openTab = async (spaceKey: PublicKey, rootUrl: string, { indexed }: { indexed: boolean }) =>
    peer.openDatabase(spaceKey, rootUrl, {
      client: await peer.createClient({ documentMode: 'proxy', proxyIndexReads: indexed }),
    });

  /**
   * A space of objects in their own documents, indexed, on a host restarted afterwards so that it has
   * none of them in memory, as after a reload.
   */
  const setup = async (count: number) => {
    const spaceKey = PublicKey.random();
    const writerClient = await peer.createClient({ documentMode: 'proxy' });
    const writer = await peer.createDatabase(spaceKey, { client: writerClient });
    const objects = Array.from({ length: count }, (_, index) =>
      writer.add(
        Obj.make(TestSchema.Expando, {
          title: `object ${index}`,
          items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
        }),
      ),
    );
    await writer.flush();
    const ids = objects.map((obj) => obj.id);
    const documentIds = objects.map(documentOf);
    const rootUrl = writer.getSpaceRootDocHandle().url;
    invariant(rootUrl, 'no space root');
    await peer.host.updateIndexes();
    await peer.closeClient(writerClient);
    await peer.restartHost();
    return { spaceKey, rootUrl, ids, documentIds };
  };

  test('a tab shows objects the worker has not loaded, and a write loads only that object', async () => {
    const { spaceKey, rootUrl, ids, documentIds } = await setup(10);
    expect(residentOf(documentIds)).toEqual([]);

    const reader = await openTab(spaceKey, rootUrl, { indexed: true });
    const objects = await Promise.all(ids.map((id) => load(reader, id)));
    expect(objects.map((obj) => obj.title)).toEqual(ids.map((_, index) => `object ${index}`));
    expect(objects.map((obj) => handleOf(obj).isCopy)).toEqual(ids.map(() => true));
    expect(residentOf(documentIds)).toEqual([]);

    Obj.update(objects[5], (obj) => {
      obj.title = 'edited';
    });
    expect(objects[5].title).toBe('edited');
    await reader.flush();
    expect(handleOf(objects[5]).isCopy).toBe(false);
    expect(await hostData(objects[5])).toEqual(expect.objectContaining({ title: 'edited' }));
    expect(residentOf(documentIds)).toEqual([documentIds[5]]);
  });

  test('a query shows objects without the worker loading their documents', async () => {
    const { spaceKey, rootUrl, ids, documentIds } = await setup(10);
    const reader = await openTab(spaceKey, rootUrl, { indexed: true });
    const objects = await reader.query(Filter.type(TestSchema.Expando)).run();
    expect(objects.map((obj) => obj.title).toSorted()).toEqual(ids.map((_, index) => `object ${index}`));
    expect(objects.map((obj) => handleOf(obj).isCopy)).toEqual(ids.map(() => true));
    expect(residentOf(documentIds)).toEqual([]);
  });

  test("a query carries its results' index copies, and the tab shows them without asking the worker again", async () => {
    const { spaceKey, rootUrl, ids, documentIds } = await setup(5);
    const reader = await openTab(spaceKey, rootUrl, { indexed: true });
    const find = vi.spyOn(Repo.ProxyRepo.prototype, 'find');
    try {
      const objects = await reader.query(Filter.type(TestSchema.Expando)).run();
      expect(objects.map((obj) => obj.title).toSorted()).toEqual(ids.map((_, index) => `object ${index}`));
      const seeded = find.mock.calls.flatMap(([documentId, options]) => (options?.copy ? [documentId] : []));
      expect(seeded.toSorted()).toEqual(documentIds.toSorted());
      expect(residentOf(documentIds)).toEqual([]);
    } finally {
      find.mockRestore();
    }
  });

  test('a reactive query sends a document copy when the document is new to it or its heads move', async () => {
    const { spaceKey, rootUrl, documentIds } = await setup(3);
    const tab = await openTab(spaceKey, rootUrl, { indexed: true });
    const responses: QueryService.QueryResponse[] = [];
    const received = EffectEx.runPromise(
      peer.host.queryService['QueryService.execQuery']({
        queryId: 'copies',
        reactivity: QueryReactivity.REACTIVE,
        query: JSON.stringify(Query.select(Filter.type(TestSchema.Expando)).from(tab).ast),
        documentCopies: true,
      }).pipe(
        Stream.take(2),
        Stream.runForEach((response) => Effect.sync(() => void responses.push(response))),
      ),
    );
    await expect.poll(() => responses.length, { timeout: 10_000 }).toBe(1);
    const copiesIn = (response: QueryService.QueryResponse) =>
      (response.documentCopies ?? []).map((copy) => copy.documentId).toSorted();
    expect(copiesIn(responses[0])).toEqual(documentIds.toSorted());
    const [copy] = responses[0].documentCopies ?? [];
    invariant(copy, 'no copy');
    expect(Object.values(JSON.parse(copy.json).objects ?? {})).toEqual([
      expect.objectContaining({ data: expect.objectContaining({ title: expect.stringMatching(/^object /) }) }),
    ]);

    // Another object joins the results: only its document is sent, the others are unchanged.
    const added = tab.add(Obj.make(TestSchema.Expando, { title: 'added' }));
    await tab.flush();
    await peer.host.updateIndexes();
    await received;
    expect(copiesIn(responses[1])).toEqual([documentOf(added)]);
  });

  test('a document whose index copy stops being exact is followed live', async () => {
    const { spaceKey, rootUrl, ids } = await setup(1);
    const reader = await openTab(spaceKey, rootUrl, { indexed: true });
    const inReader = await load(reader, ids[0]);
    const writer = await openTab(spaceKey, rootUrl, { indexed: false });
    const inWriter = await load(writer, ids[0]);
    // JSON cannot carry bytes, so the index can no longer stand in for the document.
    Obj.update(inWriter, (inWriter) => {
      inWriter.bytes = new Uint8Array([1, 2, 3]);
    });
    await writer.flush();
    await peer.host.updateIndexes();
    await expect.poll(() => handleOf(inReader).isCopy).toBe(false);
    expect(inReader.bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  test('an object read from the index follows edits made elsewhere', async () => {
    const { spaceKey, rootUrl, ids } = await setup(3);
    const reader = await openTab(spaceKey, rootUrl, { indexed: true });
    const inReader = await load(reader, ids[1]);

    const writer = await openTab(spaceKey, rootUrl, { indexed: false });
    const inWriter = await load(writer, ids[1]);
    Obj.update(inWriter, (inWriter) => {
      inWriter.title = 'renamed elsewhere';
    });
    await writer.flush();
    await peer.host.updateIndexes();

    await expect.poll(() => inReader.title).toBe('renamed elsewhere');
    expect(handleOf(inReader).isCopy).toBe(true);
  });

  test('a write made against an out-of-date index copy is rebased onto the current document', async () => {
    const { spaceKey, rootUrl, ids } = await setup(1);
    const reader = await openTab(spaceKey, rootUrl, { indexed: true });
    const inReader = await load(reader, ids[0]);

    // Keep the reader's copy out of date: the worker sends it no index updates.
    const mirrorService = peer.host.mirrorService;
    const onIndexed = mirrorService.onIndexed.bind(mirrorService);
    Reflect.set(mirrorService, 'onIndexed', () => {});
    const writer = await openTab(spaceKey, rootUrl, { indexed: false });
    const inWriter = await load(writer, ids[0]);
    Obj.update(inWriter, (inWriter) => {
      inWriter.items.splice(0, 0, { label: 'new' });
    });
    await writer.flush();
    await peer.host.updateIndexes();
    Reflect.set(mirrorService, 'onIndexed', onIndexed);
    expect(inReader.items.map((item: { label: string }) => item.label)).toEqual(['a', 'b', 'c']);

    // The reader means item `c`, which is at index 3 once the insert it has not seen is applied.
    Obj.update(inReader, (inReader) => {
      inReader.items[2].label = 'C';
    });
    await reader.flush();
    const expected = ['new', 'a', 'b', 'C'];
    expect(Op.getAt(await hostData(inReader), ['items'])).toEqual(expected.map((label) => ({ label })));
    expect(inReader.items.map((item: { label: string }) => item.label)).toEqual(expected);
    await expect.poll(() => inWriter.items.map((item: { label: string }) => item.label)).toEqual(expected);
  });

  test('a write made while the index copy arrives still reaches the worker', async () => {
    const { spaceKey, rootUrl, ids, documentIds } = await setup(1);
    const reader = await openTab(spaceKey, rootUrl, { indexed: true });
    const repo = reader._repo;
    invariant(repo instanceof MirrorRepo, 'not a mirror repo');
    const handle = repo.findIndexed<DatabaseDirectory>(documentIds[0]);
    invariant(handle instanceof MirrorDocHandle, 'not a mirror document');
    // Writes as soon as the document arrives, as a migration run on load would.
    handle.once('change', () => {
      handle.change((doc) => {
        const data = doc.objects?.[ids[0]]?.data;
        invariant(data, 'object missing');
        data.title = 'written on arrival';
      });
    });
    await handle.whenReady();
    await repo.flush();
    expect(handle.isCopy).toBe(false);
    expect(await hostDataAt(documentIds[0], ids[0])).toEqual(expect.objectContaining({ title: 'written on arrival' }));
  });

  test('a write survives the worker restarting before it lands', async () => {
    const { spaceKey, rootUrl, ids } = await setup(1);
    const reader = await openTab(spaceKey, rootUrl, { indexed: true });
    const obj = await load(reader, ids[0]);
    Obj.update(obj, (obj) => {
      obj.title = 'edited';
    });
    await peer.restartHost();
    await reader.flush();
    expect(handleOf(obj).isCopy).toBe(false);
    expect(await hostData(obj)).toEqual(expect.objectContaining({ title: 'edited' }));
  });

  test('the index copy of a document matches the worker copy', async () => {
    const spaceKey = PublicKey.random();
    const writerClient = await peer.createClient({ documentMode: 'proxy' });
    const writer = await peer.createDatabase(spaceKey, { client: writerClient });
    const plain = writer.add(
      Obj.make(TestSchema.Expando, {
        title: 'plain',
        count: 3,
        flag: true,
        nothing: null,
        nested: { list: [1, 'two', { three: 3 }] },
      }),
    );
    const linked = writer.add(Obj.make(TestSchema.Expando, { link: Ref.make(plain), links: [Ref.make(plain)] }));
    const withMeta = writer.add(Obj.make(TestSchema.Expando, { title: 'meta' }));
    Obj.update(withMeta, (withMeta) => {
      Obj.getMeta(withMeta).keys.push({ source: 'example.com', id: 'key' });
    });
    const alice = writer.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    const bob = writer.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
    const task = writer.add(Obj.make(TestSchema.Task, { title: 'task' }));
    Obj.setParent(task, alice);
    const manager = writer.add(
      Relation.make(TestSchema.HasManager, { [Relation.Source]: alice, [Relation.Target]: bob }),
    );
    const removed = writer.add(Obj.make(TestSchema.Expando, { title: 'removed' }));
    // JSON cannot carry bytes, so the worker serves this one from its Automerge copy.
    const binary = writer.add(Obj.make(TestSchema.Expando, { bytes: new Uint8Array([1, 2, 3]) }));
    await writer.flush();
    writer.remove(removed);
    await writer.flush();
    const entities: Entity.Unknown[] = [plain, linked, withMeta, alice, bob, task, manager, removed, binary];
    const documentIds = entities.map(documentOf);
    const rootUrl = writer.getSpaceRootDocHandle().url;
    invariant(rootUrl, 'no space root');
    await peer.host.updateIndexes();
    await peer.closeClient(writerClient);
    await peer.restartHost();

    const live = await openTab(spaceKey, rootUrl, { indexed: false });
    const reader = await openTab(spaceKey, rootUrl, { indexed: true });
    const liveRepo = live._repo;
    const readerRepo = reader._repo;
    invariant(liveRepo instanceof MirrorRepo && readerRepo instanceof MirrorRepo, 'not mirror repos');
    const found: string[] = [];
    for (const [index, documentId] of documentIds.entries()) {
      const fromIndex = readerRepo.findIndexed<DatabaseDirectory>(documentId);
      const fromWorker = liveRepo.find<DatabaseDirectory>(documentId);
      await Promise.all([fromIndex.whenReady(), fromWorker.whenReady()]);
      invariant(fromIndex instanceof MirrorDocHandle, 'not a mirror document');
      expect(fromIndex.isCopy, `entity ${index}`).toBe(entities[index] !== binary);
      found.push(...differences(fromIndex.doc(), fromWorker.doc(), [`entity ${index}`]));
    }
    expect(found).toEqual([]);
  });

  test('cost of showing objects from the index against loading them', { timeout: 300_000 }, async () => {
    const count = process.env.MIRROR_BENCH ? 200 : 40;
    const { spaceKey, rootUrl, ids, documentIds } = await setup(count);
    const rows: Record<string, string | number>[] = [];
    for (const indexed of [true, false]) {
      await peer.restartHost();
      const tab = await openTab(spaceKey, rootUrl, { indexed });
      const start = performance.now();
      const objects = await Promise.all(ids.map((id) => load(tab, id)));
      const elapsed = performance.now() - start;
      expect(objects.map((obj) => obj.title)).toEqual(ids.map((_, index) => `object ${index}`));
      rows.push({
        'reads': indexed ? 'from the index' : 'from the worker copy',
        'objects': count,
        'time to show all (ms)': elapsed.toFixed(1),
        'documents the worker loaded': residentOf(documentIds).length,
      });
    }
    console.table(rows);
    expect(rows[0]['documents the worker loaded']).toBe(0);
  });
});
