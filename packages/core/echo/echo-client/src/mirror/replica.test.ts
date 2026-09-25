//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { getDeep } from '@dxos/util';

import type * as Doc from '../automerge/Doc.ts';
import { getObjectCore } from '../echo-handler/index.ts';
import { heldReplica, leaseReplica } from '../replica.ts';
import { EchoTestBuilder } from '../testing/index.ts';
import { fromCursor, getTextInRange, toCursor, updateText } from '../text.ts';
import { MirrorRepo } from './mirror-repo.ts';

/**
 * A mirror tab hands one document to code written against the Automerge API as a real replica,
 * while every other document stays a mirror and other tabs keep mirrors of it.
 */
describe('replica on demand', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('the full Automerge API works on a replica and mirrors converge with it', async () => {
    const peer = await builder.createPeer();
    const spaceKey = PublicKey.random();
    const tabA = await peer.createDatabase(spaceKey, { client: await peer.createClient({ documentMode: 'proxy' }) });
    const tabB = await peer.openDatabase(spaceKey, tabA.getSpaceRootDocHandle().url, {
      client: await peer.createClient({ documentMode: 'proxy' }),
    });
    const doc = tabA.add(Obj.make(TestSchema.Expando, { content: 'hello world' }));
    const other = tabA.add(Obj.make(TestSchema.Expando, { title: 'stays a mirror' }));
    await tabA.flush();

    const core = getObjectCore(doc);
    const repo = tabA._repo;
    invariant(repo instanceof MirrorRepo && core.docHandle?.documentId, 'tab A is not a mirror client');
    const replica = await repo.replica<DatabaseDirectory>(core.docHandle.documentId);
    const path = [...core.mountPath, 'data', 'content'];

    // What libraries and tooling call: history, heads, diff, op-id cursors, splice.
    const before = A.getHeads(replica.doc());
    const cursor = A.getCursor(replica.doc(), [...path], 6);
    replica.change((draft) => A.splice(draft, [...path], 0, 0, 'Say: '));
    const patches = A.diff(replica.doc(), before, A.getHeads(replica.doc()));
    expect(patches.some((patch) => patch.action === 'splice')).toBe(true);
    expect(A.getCursorPosition(replica.doc(), [...path], cursor)).toBe(11);
    expect(A.getHistory(replica.doc()).length).toBeGreaterThan(1);

    // The mirror in the same tab and another tab's mirror converge with the replica's write.
    await tabA.flush();
    await expect.poll(() => doc.content).toBe('Say: hello world');
    const [inB] = await tabB.query(Filter.id(doc.id)).run();
    await expect.poll(() => inB?.content).toBe('Say: hello world');

    // And the other way: a mirror write reaches the replica.
    Obj.update(inB, (inB) => {
      inB.content = 'replaced by tab B';
    });
    await tabB.flush();
    await expect.poll(() => replica.doc().objects?.[doc.id]?.data?.content).toBe('replaced by tab B');

    // Only the document handed over has a replica.
    expect(getObjectCore(other).docHandle?.constructor.name).toBe('MirrorDocHandle');
    expect(repo.releaseReplica(core.docHandle.documentId)).toBe(true);
  });

  test('a lease shares one replica, and cursors on a mirrored accessor resolve through it', async () => {
    const peer = await builder.createPeer();
    const tab = await peer.createDatabase(PublicKey.random(), {
      client: await peer.createClient({ documentMode: 'proxy' }),
    });
    const doc = tab.add(Obj.make(TestSchema.Expando, { content: 'hello world' }));
    await tab.flush();
    const accessor = getObjectCore(doc).getDocAccessor(['content']);

    // A mirror has no op ids, so cursors need a replica someone holds.
    expect(() => toCursor(accessor, 6)).toThrow(/replica/);

    const first = leaseReplica(accessor);
    const second = leaseReplica(accessor);
    invariant(first && second, 'a mirrored accessor should lease a replica');
    const replica = await first.ready;
    invariant(replica, 'the replica should open');
    expect(await second.ready).toMatchObject({ handle: replica.handle });
    await expect.poll(() => first.inStep()).toBe(true);

    const cursor = toCursor(accessor, 6);
    replica.handle.change((draft) => A.splice(draft, [...replica.path], 0, 0, 'Say: '));
    await tab.flush();
    await expect.poll(() => doc.content).toBe('Say: hello world');
    expect(fromCursor(accessor, cursor)).toBe(11);
    expect(getTextInRange(accessor, toCursor(accessor, 5), cursor)).toBe('hello ');

    // The replica stays while any lease holds it.
    first.release();
    expect(heldReplica(accessor)).toBeDefined();
    second.release();
    expect(heldReplica(accessor)).toBeUndefined();
  });

  test('a lease on a document this tab just created opens once the worker names it', async () => {
    const peer = await builder.createPeer();
    const tab = await peer.createDatabase(PublicKey.random(), {
      client: await peer.createClient({ documentMode: 'proxy' }),
    });
    const doc = tab.add(Obj.make(TestSchema.Expando, { content: 'fresh' }));
    const accessor = getObjectCore(doc).getDocAccessor(['content']);

    const lease = leaseReplica(accessor);
    invariant(lease, 'a mirrored accessor should lease a replica');
    // The object's body reaches the replica once the worker applies the tab's first batch.
    const replica = await lease.ready;
    invariant(replica, 'the replica should open');
    await expect.poll(() => textOf(replica)).toBe('fresh');
    lease.release();
  });

  test('cursors map positions while the replica trails the mirror', async () => {
    const peer = await builder.createPeer();
    const tab = await peer.createDatabase(PublicKey.random(), {
      client: await peer.createClient({ documentMode: 'proxy' }),
    });
    const doc = tab.add(Obj.make(TestSchema.Expando, { content: 'hello world' }));
    await tab.flush();
    const accessor = getObjectCore(doc).getDocAccessor(['content']);
    const lease = leaseReplica(accessor);
    invariant(lease, 'a mirrored accessor should lease a replica');
    const replica = await lease.ready;
    invariant(replica, 'the replica should open');

    // The mirror has the edit at once; the replica only after the worker's round trip.
    updateText(doc, ['content'], 'XYZ hello world');
    expect(textOf(replica)).toBe('hello world');
    const cursor = toCursor(accessor, 10);
    expect(fromCursor(accessor, cursor)).toBe(10);
    expect(getTextInRange(accessor, toCursor(accessor, 4), cursor)).toBe('hello ');

    await tab.flush();
    await expect.poll(() => textOf(replica)).toBe('XYZ hello world');
    expect(fromCursor(accessor, cursor)).toBe(10);
    lease.release();
  });

  test('leases taken at the same moment on different documents all open', async () => {
    const peer = await builder.createPeer();
    const tab = await peer.createDatabase(PublicKey.random(), {
      client: await peer.createClient({ documentMode: 'proxy' }),
    });
    const docs = ['one', 'two', 'three'].map((content) => tab.add(Obj.make(TestSchema.Expando, { content })));
    await tab.flush();

    const leases = docs.map((doc) => leaseReplica(getObjectCore(doc).getDocAccessor(['content'])));
    const replicas = await Promise.all(
      leases.map((lease) => {
        invariant(lease, 'a mirrored accessor should lease a replica');
        return lease.ready;
      }),
    );
    expect(replicas.map((replica) => replica && textOf(replica))).toEqual(['one', 'two', 'three']);
    leases.forEach((lease) => lease?.release());
  });
});

const textOf = (accessor: Doc.Accessor): unknown => getDeep(accessor.handle.doc(), accessor.path);
