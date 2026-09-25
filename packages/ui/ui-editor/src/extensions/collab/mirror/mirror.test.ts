//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { heldReplica } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';

import { Cursor } from '../../../util/index.ts';
import { comments, createComment } from '../../review/index.ts';
import { automerge } from '../automerge/automerge.ts';
import { mirrorSync } from './mirror.ts';

/** Editors in two tabs bound to the same text; only the worker runs Automerge. */
describe('mirror editor binding', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const openDocs = async () => {
    const peer = await builder.createPeer();
    const spaceKey = PublicKey.random();
    const tabA = await peer.createDatabase(spaceKey, { client: await peer.createClient({ mirror: true }) });
    const tabB = await peer.openDatabase(spaceKey, tabA.getSpaceRootDocHandle().url, {
      client: await peer.createClient({ mirror: true }),
    });
    const docA = tabA.add(Obj.make(TestSchema.Expando, { content: 'hello world' }));
    await tabA.flush();
    const [docB] = await tabB.query(Filter.id(docA.id)).run();
    return { tabA, tabB, docA, docB };
  };

  const editor = (obj: Obj.Any, binding: (accessor: Doc.Accessor) => Extension) =>
    new EditorView({
      state: EditorState.create({
        doc: String(obj.content),
        extensions: [binding(Doc.createAccessor(obj, ['content']))],
      }),
      parent: document.body.appendChild(document.createElement('div')),
    });

  test('concurrent typing in two tabs converges in both editors', async () => {
    const { tabA, tabB, docA, docB } = await openDocs();
    const viewA = editor(docA, mirrorSync);
    const viewB = editor(docB, mirrorSync);

    // Neither tab has seen the other's edit when it makes its own.
    viewA.dispatch({ changes: { from: 0, insert: 'A: ' } });
    viewB.dispatch({ changes: { from: viewB.state.doc.length, insert: '!' } });
    viewB.dispatch({ changes: { from: 5, to: 11, insert: ' there' } });
    expect(docA.content).toBe('A: hello world');

    await Promise.all([tabA.flush(), tabB.flush()]);
    await Promise.all([tabA.flush(), tabB.flush()]);

    expect(viewA.state.doc.toString()).toBe('A: hello there!');
    expect(viewB.state.doc.toString()).toBe('A: hello there!');
    expect(docA.content).toBe('A: hello there!');
    expect(docB.content).toBe('A: hello there!');
    viewA.destroy();
    viewB.destroy();
  });

  test('random concurrent edits converge', async () => {
    const { tabA, tabB, docA, docB } = await openDocs();
    const viewA = editor(docA, mirrorSync);
    const viewB = editor(docB, mirrorSync);
    let seed = 42;
    const random = (max: number) => {
      seed = (seed * 48271) % 2147483647;
      return seed % max;
    };
    for (let round = 0; round < 20; round++) {
      for (const view of [viewA, viewB, viewA]) {
        const length = view.state.doc.length;
        const from = random(length + 1);
        const to = Math.min(length, from + random(3));
        view.dispatch({ changes: { from, to, insert: `${round}` } });
      }
      if (round % 3 === 0) {
        await Promise.all([tabA.flush(), tabB.flush()]);
      }
    }
    await Promise.all([tabA.flush(), tabB.flush()]);
    await Promise.all([tabA.flush(), tabB.flush()]);

    expect(viewB.state.doc.toString()).toBe(viewA.state.doc.toString());
    expect(docA.content).toBe(viewA.state.doc.toString());
    viewA.destroy();
    viewB.destroy();
  });

  test('the editor writes to the mirror and takes op-id cursors from a replica', async () => {
    const { tabB, docA, docB } = await openDocs();
    const viewA = editor(docA, automerge);
    const viewB = editor(docB, automerge);
    const accessorA = Doc.createAccessor(docA, ['content']);

    // The object reads what the editor wrote at once.
    viewA.dispatch({ changes: { from: 0, insert: 'A: ' } });
    expect(docA.content).toBe('A: hello world');

    // Once the replica has caught up, every position has a cursor.
    const converterA = () => viewA.state.facet(Cursor.converter);
    await converterA().whenExact?.();
    expect(textOf(heldReplica(accessorA))).toBe('A: hello world');
    const cursor = converterA().toCursor(3);
    expect(cursor).toMatch(/@/);

    // Cursors follow edits from the other tab.
    await expect.poll(() => viewB.state.doc.toString()).toBe('A: hello world');
    viewB.dispatch({ changes: { from: 3, insert: 'Hi, ' } });
    await tabB.flush();
    await expect.poll(() => viewA.state.doc.toString()).toBe('A: Hi, hello world');
    await expect.poll(() => converterA().fromCursor(cursor)).toBe(7);
    expect(docA.content).toBe('A: Hi, hello world');
    viewA.destroy();
    viewB.destroy();
  });

  test('an editor opened on a document the tab just created gets cursors once the worker names it', async () => {
    const peer = await builder.createPeer();
    const tab = await peer.createDatabase(PublicKey.random(), { client: await peer.createClient({ mirror: true }) });
    const doc = tab.add(Obj.make(TestSchema.Expando, { content: '' }));
    const view = editor(doc, automerge);

    view.dispatch({ changes: { from: 0, insert: 'Hello wold!' } });
    // Cursors need the replica, which has the text once the worker has created the document and applied the typing.
    await expect.poll(() => Cursor.getCursorFromRange(view.state, { from: 6, to: 10 })).toMatch(/@.*:.*@/);
    const range = Cursor.getCursorFromRange(view.state, { from: 6, to: 10 });
    expect(Cursor.getRangeFromCursor(view.state, range)).toEqual({ from: 6, to: 10 });
    await tab.flush();
    expect(doc.content).toBe('Hello wold!');
    view.destroy();
  });

  test('a comment made before the replica has the typed text is anchored once it does', async () => {
    const peer = await builder.createPeer();
    const tab = await peer.createDatabase(PublicKey.random(), { client: await peer.createClient({ mirror: true }) });
    const doc = tab.add(Obj.make(TestSchema.Expando, { content: '' }));
    const created: { cursor: string; from: number }[] = [];
    const view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          automerge(Doc.createAccessor(doc, ['content'])),
          comments({ id: doc.id, onCreate: ({ cursor, from }) => created.push({ cursor, from }) }),
        ],
      }),
      parent: document.body.appendChild(document.createElement('div')),
    });

    // Typed and commented on at once, as the e2e suite does, before the worker has created the document.
    view.dispatch({ changes: { from: 0, insert: 'Hello world!' } });
    view.dispatch({ selection: { anchor: 0, head: 12 } });
    expect(createComment(view)).toBe(true);
    view.dispatch({ changes: { from: 0, insert: '> ' } });

    await expect.poll(() => created.length).toBe(1);
    expect(created[0].from).toBe(2);
    expect(Cursor.getRangeFromCursor(view.state, created[0].cursor)).toEqual({ from: 2, to: 14 });
    view.destroy();
  });

  test('a remote insertion at the caret moves the caret past it, as the Automerge binding does', async () => {
    const { tabB, docA, docB } = await openDocs();
    const viewA = editor(docA, mirrorSync);
    const viewB = editor(docB, mirrorSync);
    viewA.dispatch({ selection: { anchor: viewA.state.doc.length } });

    viewB.dispatch({ changes: { from: viewB.state.doc.length, insert: ', again' } });
    await tabB.flush();
    await expect.poll(() => viewA.state.doc.toString()).toBe('hello world, again');
    expect(viewA.state.selection.main.head).toBe(viewA.state.doc.length);
    viewA.destroy();
    viewB.destroy();
  });
});

const textOf = (accessor: Doc.Accessor | undefined): unknown => (accessor ? Doc.getValue(accessor) : undefined);
