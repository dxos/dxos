//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { Filter, Obj, Text } from '@dxos/echo';
import { toMirror } from '@dxos/echo-host';
import { Mirror } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { getObjectCore } from '../echo-handler/index.ts';
import { EchoTestBuilder, type EchoTestPeer } from '../testing/index.ts';
import { MirrorRepo } from './mirror-repo.ts';

/** Tabs holding JSON mirrors against one host, which is the only realm running Automerge here. */
describe('mirror mode', () => {
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
    const first = await peer.createClient({ mirror: true });
    const db = await peer.createDatabase(spaceKey, { client: first });
    const rootUrl = db.getSpaceRootDocHandle().url;
    const others = await Promise.all(
      Array.from({ length: count - 1 }, async () => {
        const client = await peer.createClient({ mirror: true });
        return peer.openDatabase(spaceKey, rootUrl, { client });
      }),
    );
    return [db, ...others];
  };

  /** The host's Automerge copy of a document, as a mirror value. */
  const hostValue = async (documentId: DocumentId) => {
    using lease = await peer.host.automergeHost.loadDoc(Context.default(), documentId);
    return toMirror(lease?.doc());
  };

  test('tabs use mirror repos and hold no Automerge document', async () => {
    const [db] = await openTabs(1);
    expect(db._repo).toBeInstanceOf(MirrorRepo);
    const handle = db.getSpaceRootDocHandle();
    // A plain frozen object: Automerge calls on it throw.
    expect(Object.isFrozen(handle.doc())).toBe(true);
    expect(() => A.getHeads(handle.doc())).toThrow();
  });

  test('writes from one tab reach another and match the host document', async () => {
    const [tabA, tabB] = await openTabs(2);
    const task = tabA.add(Obj.make(TestSchema.Expando, { title: 'hello', tags: ['a'], nested: { count: 1 } }));
    await tabA.flush();

    const [inB] = await tabB.query(Filter.id(task.id)).run();
    expect(inB.title).toBe('hello');

    Obj.update(inB, (inB) => {
      inB.tags.push('b');
      inB.nested.count = 2;
    });
    await tabB.flush();
    await tabA.flush();

    expect(task.tags).toEqual(['a', 'b']);
    expect(task.nested.count).toBe(2);

    const handle = getObjectCore(task).docHandle;
    invariant(handle?.documentId, 'object has no document');
    const host = await hostValue(handle.documentId);
    expect(Mirror.mirrorEquals(host, handle.doc())).toBe(true);
  });

  test('concurrent text edits from two tabs merge', async () => {
    const [tabA, tabB] = await openTabs(2);
    const doc = tabA.add(Obj.make(TestSchema.Expando, { content: 'hello world' }));
    await tabA.flush();
    const [inB] = await tabB.query(Filter.id(doc.id)).run();

    // Neither tab has seen the other's edit when it makes its own.
    Obj.update(doc, (doc) => Text.update(doc, 'content', 'hello big world'));
    Obj.update(inB, (inB) => Text.update(inB, 'content', 'hello world!'));
    await Promise.all([tabA.flush(), tabB.flush()]);
    await Promise.all([tabA.flush(), tabB.flush()]);

    expect(doc.content).toBe('hello big world!');
    expect(inB.content).toBe('hello big world!');
  });

  test('heads advance when the worker confirms a write, and flush waits for them', async () => {
    const [db] = await openTabs(1);
    const obj = db.add(Obj.make(TestSchema.Expando, { value: 1 }));
    await db.flush();
    const before = Obj.version(obj);

    Obj.update(obj, (obj) => {
      obj.value = 2;
    });
    // Unconfirmed: the value is visible at once, the heads are not.
    expect(obj.value).toBe(2);
    expect(Obj.version(obj)).toEqual(before);

    await db.flush();
    expect(Obj.version(obj)).not.toEqual(before);
  });

  test('cursors resolve through concurrent and unconfirmed edits', async () => {
    const [tabA, tabB] = await openTabs(2);
    const doc = tabA.add(Obj.make(TestSchema.Expando, { content: 'hello world' }));
    await tabA.flush();
    const [inB] = await tabB.query(Filter.id(doc.id)).run();

    const core = getObjectCore(doc);
    const repo = tabA._repo;
    invariant(repo instanceof MirrorRepo && core.docHandle?.documentId, 'tab A is not a mirror client');
    const cursors = repo.cursors(core.docHandle.documentId, [...core.mountPath, 'data', 'content']);
    // The worker mints a cursor for the character at position 6 ('w').
    const [cursor] = await cursors.create([6]);
    invariant(cursor, 'no cursor');

    // Another tab inserts before it; this tab has not seen that when it starts tracking.
    Obj.update(inB, (inB) => Text.splice(inB, 'content', 6, 0, 'big '));
    await tabB.flush();
    await tabA.flush();
    await cursors.track([cursor]);
    expect(cursors.position(cursor)).toBe(10);
    expect(doc.content[10]).toBe('w');

    // An unconfirmed local edit moves it at once, before the worker has seen the edit.
    Obj.update(doc, (doc) => Text.splice(doc, 'content', 0, 0, 'X'));
    expect(cursors.position(cursor)).toBe(11);
    expect(doc.content[11]).toBe('w');
    cursors.dispose();
  });

  test('writes from a replica client reach mirror tabs through the worker', async () => {
    const spaceKey = PublicKey.random();
    const mirror = await peer.createClient({ mirror: true });
    const tab = await peer.createDatabase(spaceKey, { client: mirror });
    const replica = await peer.openDatabase(spaceKey, tab.getSpaceRootDocHandle().url, {
      client: await peer.createClient({ mirror: false }),
    });
    const obj = replica.add(Obj.make(TestSchema.Expando, { title: 'from replica' }));
    await replica.flush();

    // The replica's bytes land in the worker's document; the sequencer turns them into an entry.
    const [inTab] = await tab.query(Filter.id(obj.id)).run();
    expect(inTab?.title).toBe('from replica');
    Obj.update(obj, (obj) => Text.update(obj, 'title', 'edited by replica'));
    await replica.flush();
    await expect.poll(() => inTab?.title).toBe('edited by replica');
  });
});
