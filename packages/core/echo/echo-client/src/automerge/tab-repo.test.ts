//
// Copyright 2026 DXOS.org
//

import { next as Automerge } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import * as A from '@dxos/automerge-proxy/Automerge';
import * as Handle from '@dxos/automerge-proxy/Handle';
import { withoutAutomerge } from '@dxos/automerge-proxy/testing';
import { Context } from '@dxos/context';
import { Filter, Obj } from '@dxos/echo';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { getEditHistory } from '../echo-handler/edit-history.ts';
import { createObject, getObjectCore } from '../echo-handler/index.ts';
import { EchoTestBuilder, type EchoTestPeer } from '../testing/index.ts';
import { getRangeFromCursor, getTextInAnchorRange, toCursorRange } from '../text.ts';
import { TabClientRepo } from './tab-repo.ts';

/** Tabs holding tab documents against one worker, which is the only realm running Automerge here. */
describe('tab documents in ECHO', () => {
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
    const first = await peer.createClient({ documentMode: 'proxy' });
    const db = await peer.createDatabase(spaceKey, { client: first });
    const rootUrl = db.getSpaceRootDocHandle().url;
    const others = await Promise.all(
      Array.from({ length: count - 1 }, async () => {
        const client = await peer.createClient({ documentMode: 'proxy' });
        return peer.openDatabase(spaceKey, rootUrl, { client });
      }),
    );
    return [db, ...others];
  };

  /** The worker's Automerge copy of a document. */
  const workerDoc = async (documentId: DocumentId) => {
    using lease = await peer.host.automergeHost.loadDoc<DatabaseDirectory>(Context.default(), documentId);
    invariant(lease, `worker has no document ${documentId}`);
    return Automerge.clone(lease.doc());
  };

  const documentOf = (obj: Obj.Unknown) => {
    const handle = getObjectCore(obj).docHandle;
    invariant(handle?.documentId, 'object has no document');
    return { handle, documentId: handle.documentId };
  };

  test('tabs use tab document repos and hold no Automerge document', async () => {
    const [db] = await openTabs(1);
    expect(db._repo).toBeInstanceOf(TabClientRepo);
    const doc = db.getSpaceRootDocHandle().doc();
    expect(Handle.tagOf(doc)).toBeDefined();
    expect(Automerge.isAutomerge(doc)).toBe(false);
    expect(A.getHeads(doc).length).toBeGreaterThan(0);
  });

  test("writes from one tab reach another, and the worker holds exactly the tabs' heads", async () => {
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
    await expect.poll(() => task.tags.join(), { timeout: 5_000 }).toBe('a,b');
    expect(task.nested.count).toBe(2);

    const { handle, documentId } = documentOf(task);
    const worker = await workerDoc(documentId);
    expect(Automerge.getHeads(worker)).toEqual(A.getHeads(handle.doc()));
    expect(Automerge.toJS(worker)).toEqual(A.toJS(handle.doc()));
  });

  test('heads read right after a write are final: the worker ends up with exactly those heads', async () => {
    const [tab] = await openTabs(1);
    const task = tab.add(Obj.make(TestSchema.Expando, { title: 'draft' }));
    await tab.flush();
    Obj.update(task, (task) => {
      task.title = 'final';
    });
    const version = Obj.version(task);
    expect(version.versioned).toBe(true);
    await tab.flush();
    const { documentId } = documentOf(task);
    expect(Automerge.getHeads(await workerDoc(documentId))).toEqual(version.automergeHeads);
  });

  test('concurrent text edits from two tabs merge as Automerge merges them', async () => {
    const [tabA, tabB] = await openTabs(2);
    const note = tabA.add(Obj.make(TestSchema.Expando, { content: 'The quick brown fox.' }));
    await tabA.flush();
    const [inB] = await tabB.query(Filter.id(note.id)).run();
    const accessorA = getObjectCore(note).getDocAccessor(['content']);
    const accessorB = getObjectCore(inB).getDocAccessor(['content']);
    accessorA.handle.change((doc) => A.splice(doc, accessorA.path.slice(), 4, 0, 'very '));
    accessorB.handle.change((doc) => A.splice(doc, accessorB.path.slice(), 19, 0, ' jumps'));
    await Promise.all([tabA.flush(), tabB.flush()]);
    await expect
      .poll(() => [note.content, inB.content].join('|'), { timeout: 5_000 })
      .toBe('The very quick brown fox jumps.|The very quick brown fox jumps.');
    const { handle, documentId } = documentOf(note);
    const worker = await workerDoc(documentId);
    expect(Automerge.getHeads(worker)).toEqual(A.getHeads(handle.doc()));
  });

  test('anchors minted in one tab as text is written resolve in another, and collapse as Automerge collapses them', async () => {
    const [writerDb, readerDb] = await openTabs(2);
    const note = writerDb.add(Obj.make(TestSchema.Expando, { content: 'Intro. Body text here. Outro.' }));
    await writerDb.flush();
    const [inReader] = await readerDb.query(Filter.id(note.id)).run();
    const writer = getObjectCore(note).getDocAccessor(['content']);
    const reader = getObjectCore(inReader).getDocAccessor(['content']);

    // Anchored at once, before the worker has seen the text.
    writer.handle.change((doc) => A.splice(doc, writer.path.slice(), 7, 0, 'NEW PARAGRAPH. '));
    const anchors = [toCursorRange(writer, 7, 20), toCursorRange(writer, 0, 6), toCursorRange(writer, 22, 31)];
    const texts = anchors.map((anchor) => getTextInAnchorRange(writer, anchor));
    expect(texts[0]).toBe('NEW PARAGRAPH');

    await writerDb.flush();
    await expect.poll(() => inReader.content, { timeout: 5_000 }).toBe(note.content);
    anchors.forEach((anchor, index) => {
      expect(getTextInAnchorRange(reader, anchor)).toBe(texts[index]);
    });
    // plugin-markdown sorts anchors by position, which needs every anchor resolved in the reader.
    const start = (anchor: string): number => {
      const range = getRangeFromCursor(reader, anchor);
      invariant(range, `Anchor ${anchor} does not resolve`);
      return range.start;
    };
    expect([...anchors].sort((left, right) => start(left) - start(right))).toEqual([
      anchors[1],
      anchors[0],
      anchors[2],
    ]);

    reader.handle.change((doc) => A.splice(doc, reader.path.slice(), 5, 17, ''));
    await readerDb.flush();
    await expect.poll(() => note.content, { timeout: 5_000 }).toBe(inReader.content);
    const { documentId } = documentOf(note);
    const worker = await workerDoc(documentId);
    const path = [...writer.path];
    for (const anchor of anchors) {
      const [from, to] = anchor.split(':');
      const text = String(Automerge.toJS(worker).objects?.[note.id]?.data?.content ?? '');
      const want = {
        start: Automerge.getCursorPosition(worker, path, from),
        end: to === 'end' ? text.length : Automerge.getCursorPosition(worker, path, to),
      };
      expect(getRangeFromCursor(reader, anchor)).toEqual(want);
      expect(getRangeFromCursor(writer, anchor)).toEqual(want);
    }
  });

  test('an object made in a tab with no Automerge starts in a tab document and moves into the database', async () => {
    const [db, other] = await openTabs(2);
    // A proxy-mode tab in a browser registers no Automerge, so an object's first document is a tab document.
    const task = withoutAutomerge(() => createObject(Obj.make(TestSchema.Expando, { title: 'Draft', status: 'todo' })));
    expect(Handle.tagOf(getObjectCore(task).getDoc())).toBeDefined();
    Obj.update(task, (task) => {
      task.status = 'doing';
    });
    const version = Obj.version(task);
    expect(version.versioned).toBe(true);
    expect(version.automergeHeads).toEqual(A.getHeads(getObjectCore(task).getDoc()));

    // Adding it copies its value into the database's document, as with a replica; so does adding a plain object.
    withoutAutomerge(() => db.add(task));
    const direct = withoutAutomerge(() => db.add(Obj.make(TestSchema.Expando, { title: 'Added', status: 'todo' })));
    Obj.update(task, (task) => {
      task.title = 'Final';
    });
    await db.flush();
    const worker = await workerDoc(documentOf(task).documentId);
    expect(Automerge.toJS(worker).objects?.[task.id]?.data).toMatchObject({ title: 'Final', status: 'doing' });
    expect(Obj.version(task).automergeHeads).toEqual(Automerge.getHeads(worker));
    const directWorker = await workerDoc(documentOf(direct).documentId);
    expect(Automerge.toJS(directWorker).objects?.[direct.id]?.data).toMatchObject({ title: 'Added', status: 'todo' });
    const [inOther] = await other.query(Filter.id(task.id)).run();
    await expect.poll(() => inOther?.title, { timeout: 5_000 }).toBe('Final');
  });

  test("an object's history and update time read from the tab document as they do from Automerge", async () => {
    const [tab] = await openTabs(1);
    const task = tab.add(Obj.make(TestSchema.Expando, { title: 'one', status: 'todo' }));
    await tab.flush();
    Obj.update(task, (task) => {
      task.status = 'doing';
    });
    Obj.update(task, (task) => {
      task.title = 'two';
    });
    await tab.flush();

    const history = getEditHistory(task);
    const { documentId } = documentOf(task);
    const worker = await workerDoc(documentId);
    expect(history.map((state) => state.change.hash)).toEqual(
      Automerge.getHistory(worker).map((state) => state.change.hash),
    );
    expect(Obj.getMeta(task).updatedAt).toBeGreaterThan(0);
  });
});
