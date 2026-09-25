//
// Copyright 2026 DXOS.org
//

import { type DocumentId, generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import * as AutomergeOps from '@dxos/automerge-proxy/AutomergeOps';
import * as Op from '@dxos/automerge-proxy/Op';
import { Context } from '@dxos/context';
import { Filter, Obj, Text } from '@dxos/echo';
import { type MirrorServiceImpl } from '@dxos/echo-host';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { makeInProcessClient } from '@dxos/protocols';
import { DataService, type MirrorService, QueryService } from '@dxos/protocols/rpc';

import { type EditsRejectedEvent } from '../automerge/index.ts';
import { getObjectCore } from '../echo-handler/index.ts';
import { EditsRejectedError } from '../errors.ts';
import { EchoTestBuilder, type EchoTestPeer } from '../testing/index.ts';
import { MirrorDocHandle } from './mirror-doc-handle.ts';
import { MirrorRepo } from './mirror-repo.ts';

class StreamDroppedError extends Error {
  readonly _tag = 'StreamDroppedError';

  constructor() {
    super('stream dropped');
  }
}

class CreateRefusedError extends Error {
  readonly _tag = 'CreateRefusedError';

  constructor() {
    super('createDocument refused');
  }
}

/** Failure modes an adversarial review found in the mirror protocol, each of which once lost or duplicated edits. */
describe('mirror repo and worker', () => {
  let builder: EchoTestBuilder;
  let peer: EchoTestPeer;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    peer = await builder.createPeer();
  });

  afterEach(async () => {
    await builder.close();
  });

  const openTabs = async (count: number) => {
    const spaceKey = PublicKey.random();
    const db = await peer.createDatabase(spaceKey, { client: await peer.createClient({ documentMode: 'proxy' }) });
    const rootUrl = db.getSpaceRootDocHandle().url;
    const others = await Promise.all(
      Array.from({ length: count - 1 }, async () =>
        peer.openDatabase(spaceKey, rootUrl, { client: await peer.createClient({ documentMode: 'proxy' }) }),
      ),
    );
    return { spaceKey, rootUrl, tabs: [db, ...others] };
  };

  const handleOf = (obj: Obj.Any): MirrorDocHandle<unknown> => {
    const handle = getObjectCore(obj).docHandle;
    invariant(handle instanceof MirrorDocHandle, 'not a mirror document');
    return handle;
  };

  const documentOf = (obj: Obj.Any): DocumentId => {
    const documentId = handleOf(obj).documentId;
    invariant(documentId, 'object has no document');
    return documentId;
  };

  /** The worker's Automerge copy of an object's data. */
  const hostData = async (obj: Obj.Any) => {
    using lease = await peer.host.automergeHost.loadDoc(Context.default(), documentOf(obj));
    return Op.getAt(AutomergeOps.toValue(lease?.doc()), ['objects', obj.id, 'data']);
  };

  type Submit = (request: MirrorService.SubmitRequest) => ReturnType<MirrorServiceImpl['MirrorService.submit']>;

  /** Replaces the worker's submit handler for the rest of the test. */
  const interceptSubmit = (handler: (request: MirrorService.SubmitRequest, submit: Submit) => ReturnType<Submit>) => {
    const service = peer.host.mirrorService;
    const submit: Submit = service['MirrorService.submit'].bind(service);
    Reflect.set(service, 'MirrorService.submit', (request: MirrorService.SubmitRequest) => handler(request, submit));
  };

  test('a failed save keeps the batch and the entries; nothing is applied twice', async () => {
    const {
      tabs: [tabA, tabB],
    } = await openTabs(2);
    const doc = tabA.add(Obj.make(TestSchema.Expando, { content: 'hello', items: [] }));
    await tabA.flush();
    const [inB] = await tabB.query(Filter.id(doc.id)).run();

    const host = peer.host.automergeHost;
    const flush = host.flush.bind(host);
    let failures = 1;
    host.flush = async (ctx, request) => {
      if (failures-- > 0) {
        throw new Error('disk full');
      }
      return flush(ctx, request);
    };

    Obj.update(doc, (doc) => Text.splice(doc, 'content', 5, 0, '!'));
    await expect(tabA.flush()).rejects.toThrow('disk full');
    await tabA.flush();
    Obj.update(inB, (inB) => {
      inB.items.push('from B');
    });
    await tabB.flush();
    await tabA.flush();

    expect(await hostData(doc)).toEqual(expect.objectContaining({ content: 'hello!', items: ['from B'] }));
    for (const obj of [doc, inB]) {
      await expect.poll(() => obj.content).toBe('hello!');
      await expect.poll(() => [...obj.items]).toEqual(['from B']);
      expect(handleOf(obj).hasPending).toBe(false);
    }
  });

  test('the worker refusing the middle change of a batch drops only it, reports it and fails the flush', async () => {
    const {
      tabs: [tab],
    } = await openTabs(1);
    const obj = tab.add(Obj.make(TestSchema.Expando, { first: 'a', second: 'b', third: 'c', list: ['x'] }));
    await tab.flush();
    const rejected: EditsRejectedEvent[] = [];
    tab.editsRejected.on((event) => rejected.push(event));

    // The change that writes `second` is corrupted in transit, so it no longer fits the document.
    let corrupted: { index: number; changes: number } | undefined;
    interceptSubmit((request, submit) => {
      const batch = request.batches.find((batch) => batch.documentId === documentOf(obj));
      const index = batch?.changes.findIndex((change) => JSON.stringify(change).includes('"second"')) ?? -1;
      if (corrupted || !batch || index === -1) {
        return submit(request);
      }
      corrupted = { index, changes: batch.changes.length };
      const bad = { type: 'put', path: ['objects', obj.id, 'data', 'list', 7], value: 'x' };
      return submit({
        ...request,
        batches: request.batches.map((candidate) =>
          candidate === batch
            ? { ...batch, changes: batch.changes.map((change, at) => (at === index ? [...change, bad] : change)) }
            : candidate,
        ),
      });
    });

    // Three `change()` calls before the next submit, so they travel in one batch.
    Obj.update(obj, (obj) => {
      obj.first = 'A';
    });
    Obj.update(obj, (obj) => {
      obj.second = 'B';
    });
    Obj.update(obj, (obj) => {
      obj.third = 'C';
    });
    await expect(tab.flush()).rejects.toThrow(EditsRejectedError);
    expect(corrupted).toEqual({ index: 1, changes: 3 });
    expect(rejected).toEqual([{ documentId: documentOf(obj), changes: [expect.any(Array)] }]);
    expect(JSON.stringify(rejected[0].changes)).toContain('"second"');

    // The change after the refused one is sent again and lands.
    await tab.flush();
    expect(obj.second).toBe('b');
    expect(await hostData(obj)).toEqual(expect.objectContaining({ first: 'A', second: 'b', third: 'C' }));

    Obj.update(obj, (obj) => {
      obj.second = 'after';
    });
    await tab.flush();
    expect(await hostData(obj)).toEqual(expect.objectContaining({ second: 'after' }));
  });

  test('a write in one tab beats a concurrent delete in another, as Automerge merges them', async () => {
    const {
      tabs: [tabA, tabB],
    } = await openTabs(2);
    const inA = tabA.add(
      Obj.make(TestSchema.Expando, { title: 'old', tags: ['a', 'b', 'c'], nested: { key: { deep: 'x' } } }),
    );
    await tabA.flush();
    const [inB] = await tabB.query(Filter.id(inA.id)).run();

    Obj.update(inA, (inA) => {
      delete inA.title;
      inA.tags.splice(1, 1);
      delete inA.nested.key;
    });
    Obj.update(inB, (inB) => {
      inB.title = 'new';
      inB.tags[1] = 'B';
      inB.nested.key.deep = 'edited inside';
    });
    await Promise.all([tabA.flush(), tabB.flush()]);

    // What `A.merge` of the same two edits gives, in either order.
    const merged = { title: 'new', tags: ['a', 'B', 'c'], nested: {} };
    expect(await hostData(inA)).toEqual(expect.objectContaining(merged));
    for (const obj of [inA, inB]) {
      await expect.poll(() => ({ title: obj.title, tags: [...obj.tags], nested: { ...obj.nested } })).toEqual(merged);
    }
  });

  test('a batch the worker would not apply is sent again once the tab has caught up', async () => {
    const {
      tabs: [tabA, tabB],
    } = await openTabs(2);
    const obj = tabA.add(Obj.make(TestSchema.Expando, { title: 'start', count: 0 }));
    await tabA.flush();
    const [inB] = await tabB.query(Filter.id(obj.id)).run();

    // As when the batch's base fell out of the worker's entry window.
    let refused = false;
    interceptSubmit((request, submit) => {
      if (refused || !request.batches.some((batch) => batch.documentId === documentOf(obj))) {
        return submit(request);
      }
      refused = true;
      return Effect.succeed({
        results: request.batches.map(({ documentId, batchId }) => ({ documentId, batchId, status: 'resync' as const })),
      });
    });

    Obj.update(obj, (obj) => {
      obj.title = 'from A';
    });
    Obj.update(inB, (inB) => {
      inB.count = 1;
    });
    await tabB.flush();
    await tabA.flush();
    expect(refused).toBe(true);
    expect(await hostData(obj)).toEqual(expect.objectContaining({ title: 'from A', count: 1 }));
    await expect.poll(() => inB.title).toBe('from A');
  });

  test('a tab following a document while its last follower leaves is not orphaned', async () => {
    const {
      spaceKey,
      rootUrl,
      tabs: [tabC],
    } = await openTabs(1);
    const obj = tabC.add(Obj.make(TestSchema.Expando, { title: 'c0', count: 0 }));
    await tabC.flush();
    const documentId = documentOf(obj);
    const tabB = await peer.openDatabase(spaceKey, rootUrl, {
      client: await peer.createClient({ documentMode: 'proxy' }),
    });
    const repoB = tabB._repo;
    const repoC = tabC._repo;
    invariant(repoB instanceof MirrorRepo && repoC instanceof MirrorRepo, 'not mirror repos');

    // A slow save keeps tab B's delivery queued while tab C, the only follower, lets the document go.
    const host = peer.host.automergeHost;
    const flush = host.flush.bind(host);
    host.flush = async (ctx, request) => {
      await sleep(300);
      return flush(ctx, request);
    };
    const handleB = repoB.find<DatabaseDirectory>(documentId);
    await sleep(50);
    expect(repoC.release(documentId)).toBe(true);
    await handleB.whenReady();
    host.flush = flush;

    handleB.change((doc) => {
      const data = doc.objects?.[obj.id]?.data;
      invariant(data, 'object missing');
      data.title = 'from B';
    });
    const handleC = repoC.find<DatabaseDirectory>(documentId);
    await handleC.whenReady();
    handleC.change((doc) => {
      const data = doc.objects?.[obj.id]?.data;
      invariant(data, 'object missing');
      data.count = 99;
    });
    await Promise.all([repoB.flush(), repoC.flush()]);

    const expected = expect.objectContaining({ title: 'from B', count: 99 });
    expect(await hostData(obj)).toEqual(expected);
    for (const handle of [handleB, handleC]) {
      await expect.poll(() => Op.getAt(handle.doc(), ['objects', obj.id, 'data'])).toEqual(expected);
    }
  });

  test('a tab whose subscription stream ends follows its documents again', async () => {
    const service = peer.host.mirrorService;
    const subscribe = service['MirrorService.subscribe'].bind(service);
    let drops = 1;
    Reflect.set(service, 'MirrorService.subscribe', (request: MirrorService.SubscribeRequest) => {
      const stream = subscribe(request);
      // The first stream delivers a few batches, then ends as a dropped transport would.
      return drops-- > 0 ? stream.pipe(Stream.take(3), Stream.concat(Stream.fail(new StreamDroppedError()))) : stream;
    });
    const {
      tabs: [tabA, tabB],
    } = await openTabs(2);
    const obj = tabB.add(Obj.make(TestSchema.Expando, { title: 'from B' }));
    await tabB.flush();

    await expect.poll(async () => (await tabA.query(Filter.id(obj.id)).run())[0]?.title).toBe('from B');
    const [inA] = await tabA.query(Filter.id(obj.id)).run();
    Obj.update(inA, (inA) => {
      inA.title = 'from A';
    });
    await tabA.flush();
    await expect.poll(() => obj.title).toBe('from A');
    expect(drops).toBeLessThan(0);
  });

  test('flush rejects when the worker keeps refusing a creation, and a later flush lands it', async () => {
    const spaceKey = PublicKey.random();
    const client = await peer.createClient({ documentMode: 'proxy' });
    const db = await peer.createDatabase(spaceKey, { client });
    await db.flush();

    let refuse = true;
    const scope = Effect.runSync(Scope.make());
    onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
    const dataHandlers = new Proxy(peer.host.dataService, {
      get: (target, key) => {
        const value = Reflect.get(target, key);
        if (key === 'DataService.createDocument' && typeof value === 'function') {
          return (...args: unknown[]) => (refuse ? Effect.fail(new CreateRefusedError()) : value.apply(target, args));
        }
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const [dataService, queryService] = await EffectEx.runPromise(
      Effect.all([
        makeInProcessClient(DataService.Rpcs, dataHandlers),
        makeInProcessClient(QueryService.Rpcs, peer.host.queryService),
      ]).pipe(Effect.provideService(Scope.Scope, scope)),
    );
    client._updateServices({ dataService, queryService });

    const obj = db.add(Obj.make(TestSchema.Expando, { title: 'created' }));
    await expect(db.flush()).rejects.toThrow('createDocument refused');
    refuse = false;
    await db.flush();
    expect(await hostData(obj)).toEqual(expect.objectContaining({ title: 'created' }));
  });

  test('flush does not wait for a document the worker is still fetching', async () => {
    const {
      tabs: [db],
    } = await openTabs(1);
    const obj = db.add(Obj.make(TestSchema.Expando, { title: 'x' }));
    await db.flush();
    db._repo.find(parseAutomergeUrl(generateAutomergeUrl()).documentId);
    Obj.update(obj, (obj) => {
      obj.title = 'y';
    });
    const outcome = await Promise.race([db.flush().then(() => 'flushed'), sleep(5_000).then(() => 'pending')]);
    expect(outcome).toBe('flushed');
  });

  test('waitUntilHeadsReplicated resolves after the root document moved past the heads', async () => {
    const {
      tabs: [tabA, tabB],
    } = await openTabs(2);
    tabA.add(Obj.make(TestSchema.Expando, { title: 'one' }), { placeIn: 'root-doc' });
    await tabA.flush();
    const heads = await tabA.getDocumentHeads();
    tabA.add(Obj.make(TestSchema.Expando, { title: 'two' }), { placeIn: 'root-doc' });
    await tabA.flush();
    await tabB.waitUntilHeadsReplicated(heads);
    expect((await tabB.query(Filter.type(TestSchema.Expando)).run()).map((obj) => obj.title).sort()).toEqual([
      'one',
      'two',
    ]);
  });

  test('an object with unconfirmed edits reports no version', async () => {
    const {
      tabs: [db],
    } = await openTabs(1);
    const inRoot = db.add(Obj.make(TestSchema.Expando, { title: 'in root' }), { placeIn: 'root-doc' });
    expect(Obj.version(inRoot).versioned).toBe(false);

    // At the worker's first snapshot of a linked document, the version follows what is still unconfirmed.
    const linked = db.add(Obj.make(TestSchema.Expando, { title: 'linked' }));
    const handle = handleOf(linked);
    const atSnapshot = await new Promise<{ versioned: boolean; pending: boolean }>((resolve) => {
      handle.confirmed.once(() =>
        resolve({
          versioned: Obj.version(linked).versioned,
          pending: handle.hasPendingAt(getObjectCore(linked).mountPath),
        }),
      );
    });
    expect(atSnapshot.versioned).toBe(!atSnapshot.pending);

    await db.flush();
    expect(Obj.version(inRoot).versioned).toBe(true);
    expect(Obj.version(linked).versioned).toBe(true);
    Obj.update(linked, (linked) => {
      linked.title = 'edited';
    });
    expect(Obj.version(linked).versioned).toBe(false);
  });

  test('tabs confirm only saved changes, including ones absorbed from other writers', async () => {
    const {
      tabs: [tab],
    } = await openTabs(1);
    const obj = tab.add(Obj.make(TestSchema.Expando, { title: 'saved', count: 0 }));
    await tab.flush();
    const handle = handleOf(obj);
    const documentId = documentOf(obj);
    const host = peer.host.automergeHost;
    using lease = await host.loadDoc<DatabaseDirectory>(Context.default(), documentId);
    invariant(lease, 'document not loaded');

    // A change lands in memory after the save the event reports, before the mirror absorbs.
    let armed = true;
    host.documentHeadsChanged.on(({ documentId: changed }) => {
      if (changed === documentId && armed) {
        armed = false;
        lease.change((doc) => {
          const data = doc.objects?.[obj.id]?.data;
          invariant(data, 'object missing');
          data.title = 'saved later';
        });
      }
    });
    lease.change((doc) => {
      const data = doc.objects?.[obj.id]?.data;
      invariant(data, 'object missing');
      data.count = 1;
    });
    await host.flush(Context.default(), { documentIds: [documentId] });
    await expect.poll(() => obj.title).toBe('saved later');

    let persisted: readonly string[] = [];
    for await (const entry of host.listDocumentHeads()) {
      if (entry.documentId === documentId) {
        persisted = entry.heads;
      }
    }
    expect([...handle.heads].sort()).toEqual([...persisted].sort());
  });
});
