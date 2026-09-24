//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { MirrorDocHandle, getObjectCore } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

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

  const openEditors = async () => {
    const peer = await builder.createPeer();
    const spaceKey = PublicKey.random();
    const tabA = await peer.createDatabase(spaceKey, { client: await peer.createClient({ mirror: true }) });
    const tabB = await peer.openDatabase(spaceKey, tabA.getSpaceRootDocHandle().url, {
      client: await peer.createClient({ mirror: true }),
    });
    const docA = tabA.add(Obj.make(TestSchema.Expando, { content: 'hello world' }));
    await tabA.flush();
    const [docB] = await tabB.query(Filter.id(docA.id)).run();

    const editor = (obj: Obj.Any) => {
      const core = getObjectCore(obj);
      invariant(core.docHandle instanceof MirrorDocHandle, 'not a mirror document');
      const path = [...core.mountPath, 'data', 'content'];
      return new EditorView({
        state: EditorState.create({
          doc: String(obj.content),
          extensions: [mirrorSync({ handle: core.docHandle, path })],
        }),
        parent: document.body.appendChild(document.createElement('div')),
      });
    };

    return { tabA, tabB, docA, docB, viewA: editor(docA), viewB: editor(docB) };
  };

  test('concurrent typing in two tabs converges in both editors', async () => {
    const { tabA, tabB, docA, docB, viewA, viewB } = await openEditors();

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
    const { tabA, tabB, docA, viewA, viewB } = await openEditors();
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
});
