//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Op } from '@dxos/automerge-proxy';
import { AutomergeOps } from '@dxos/automerge-proxy/host';
import { createRandom } from '@dxos/automerge-proxy/testing';
import { Context } from '@dxos/context';
import { Filter, Obj, Text } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { getObjectCore } from '../echo-handler/index.ts';
import { EchoTestBuilder, type EchoTestPeer } from '../testing/index.ts';
import { MirrorDocHandle } from './mirror-doc-handle.ts';
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
    return AutomergeOps.toValue(lease?.doc());
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
    expect(Op.equals(host, handle.doc())).toBe(true);
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
    // Unconfirmed: the value is visible at once, the heads are not, so there is no version to report.
    expect(obj.value).toBe(2);
    expect(Obj.version(obj).automergeHeads).toEqual(before.automergeHeads);
    expect(Obj.version(obj).versioned).toBe(false);

    await db.flush();
    expect(Obj.version(obj).versioned).toBe(true);
    expect(Obj.version(obj).automergeHeads).not.toEqual(before.automergeHeads);
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

  test('a worker restart keeps confirmed edits and applies edits made while it was down once', async () => {
    const [tabA, tabB] = await openTabs(2);
    const task = tabA.add(Obj.make(TestSchema.Expando, { title: 'before', log: ['confirmed'] }));
    await tabA.flush();
    const [inB] = await tabB.query(Filter.id(task.id)).run();
    const documentId = getObjectCore(task).docHandle?.documentId;
    invariant(documentId, 'object has no document');

    await peer.restartHost(() => {
      // No worker is running: both tabs hold these as unconfirmed edits.
      Obj.update(task, (task) => {
        task.log.push('A while down');
      });
      Obj.update(inB, (inB) => {
        inB.log.push('B while down');
        Text.update(inB, 'title', 'before, after');
      });
    });
    await Promise.all([tabA.flush(), tabB.flush()]);
    await Promise.all([tabA.flush(), tabB.flush()]);

    for (const obj of [task, inB]) {
      expect([...obj.log].sort()).toEqual(['A while down', 'B while down', 'confirmed']);
      expect(obj.title).toBe('before, after');
    }
    // The new worker's Automerge copy holds each edit once.
    const host = await hostValue(documentId);
    const data = Op.getAt(host, ['objects', task.id, 'data']);
    expect(data).toEqual(expect.objectContaining({ title: 'before, after' }));
    expect(Op.getAt(host, ['objects', task.id, 'data', 'log'])).toHaveLength(3);
    const handle = getObjectCore(task).docHandle;
    invariant(handle instanceof MirrorDocHandle, 'not a mirror document');
    expect(handle.hasPending).toBe(false);
    expect(handle.heads.length).toBeGreaterThan(0);
  });

  test('a tab reconnecting to the same worker writes once, whether or not the worker kept the document', async () => {
    const [tabA, tabB] = await openTabs(2);
    const task = tabA.add(Obj.make(TestSchema.Expando, { log: ['one'] }));
    await tabA.flush();
    const [inB] = await tabB.query(Filter.id(task.id)).run();
    const documentId = getObjectCore(task).docHandle?.documentId;
    invariant(documentId, 'object has no document');

    // Tab B keeps the document followed, so the worker keeps its numbering; the edit may be in flight.
    Obj.update(task, (task) => {
      task.log.push('two');
    });
    await tabA._onReconnect();
    Obj.update(task, (task) => {
      task.log.push('three');
    });
    await tabA.flush();
    await expect.poll(() => [...inB.log]).toEqual(['one', 'two', 'three']);

    // Alone, the tab is the document's last subscriber: the worker starts a new numbering for it.
    const [solo] = await openTabs(1);
    const note = solo.add(Obj.make(TestSchema.Expando, { log: ['one'] }));
    await solo.flush();
    Obj.update(note, (note) => {
      note.log.push('two');
    });
    await solo._onReconnect();
    Obj.update(note, (note) => {
      note.log.push('three');
    });
    await solo.flush();
    expect([...note.log]).toEqual(['one', 'two', 'three']);

    for (const [obj, id] of [
      [task, documentId],
      [note, getObjectCore(note).docHandle?.documentId],
    ] as const) {
      invariant(id, 'object has no document');
      expect(Op.getAt(await hostValue(id), ['objects', obj.id, 'data', 'log'])).toEqual(['one', 'two', 'three']);
    }
  });

  test('random edits across worker restarts converge with every edit applied once', async () => {
    const seeds = Number(process.env.MIRROR_FUZZ_SEEDS ?? 3);
    const totals = { restarts: 0, edits: 0 };
    for (let seed = 1; seed <= seeds; seed++) {
      // A peer per seed, so a restart reconnects only this seed's tabs.
      peer = await builder.createPeer();
      const random = createRandom(seed);
      const tabs = await openTabs(3);
      const task = tabs[0].add(Obj.make(TestSchema.Expando, { log: [], text: '' }));
      await tabs[0].flush();
      const objects = await Promise.all(tabs.map(async (tab) => (await tab.query(Filter.id(task.id)).run())[0]));
      const expected: string[] = [];

      const edit = (round: number) => {
        objects.forEach((obj, tab) => {
          if (random.chance(0.6)) {
            const marker = `${seed}.${round}.${tab}`;
            expected.push(marker);
            // Between markers only, so a marker is never split and each one can be counted.
            const boundaries = [0, ...[...obj.text].flatMap((char, index) => (char === '>' ? [index + 1] : []))];
            Obj.update(obj, (obj) => {
              obj.log.push(marker);
              Text.splice(obj, 'text', random.pick(boundaries), 0, `<${marker}>`);
            });
          }
        });
      };

      for (let round = 0; round < 12; round++) {
        edit(round);
        if (random.chance(0.3)) {
          // Batches may be in flight when the worker goes away; more edits arrive while it is down.
          totals.restarts++;
          await peer.restartHost(() => edit(round + 0.5));
        } else if (random.chance(0.5)) {
          await Promise.all(tabs.map((tab) => tab.flush()));
        }
      }
      await Promise.all(tabs.map((tab) => tab.flush()));
      await Promise.all(tabs.map((tab) => tab.flush()));

      const markers = expected.slice().sort();
      for (const obj of objects) {
        expect([...obj.log].sort(), `seed ${seed}`).toEqual(markers);
        expect(obj.text, `seed ${seed}`).toBe(objects[0].text);
        expect(
          obj.text
            .match(/<[^>]+>/g)
            ?.slice()
            .sort() ?? [],
          `seed ${seed}`,
        ).toEqual(markers.map((marker) => `<${marker}>`).sort());
      }
      const documentId = getObjectCore(task).docHandle?.documentId;
      invariant(documentId, 'object has no document');
      expect(Op.getAt(await hostValue(documentId), ['objects', task.id, 'data', 'text'])).toBe(objects[0].text);
      totals.edits += expected.length;
      await peer.close();
    }
    console.log(totals);
  });
});
