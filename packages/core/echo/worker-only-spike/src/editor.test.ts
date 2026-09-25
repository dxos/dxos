//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { afterEach, describe, expect, test, vi } from 'vitest';

// The only change the editor needs: its Automerge imports answer for tab documents.
vi.mock('@automerge/automerge', async (importOriginal) =>
  (await import('./mocks.ts')).automergeFactory(importOriginal),
);
vi.mock('@dxos/automerge-proxy/Automerge', async (importOriginal) =>
  (await import('./mocks.ts')).proxyNamespaceFactory(importOriginal),
);

// eslint-disable-next-line import/first
import { Cursor, automerge } from '@dxos/ui-editor';

// eslint-disable-next-line import/first
import { SpikeHost } from './host.ts';
// eslint-disable-next-line import/first
import { leaks } from './namespace.ts';
// eslint-disable-next-line import/first
import { Network, type Tab } from './network.ts';
// eslint-disable-next-line import/first
import { seeded, unknownTo } from './testing.ts';

const views: EditorView[] = [];
afterEach(() => {
  views.splice(0).forEach((view) => view.destroy());
});

const openEditor = (tab: Tab): EditorView => {
  const accessor = { handle: tab.handle, path: ['content'] as const };
  const view = new EditorView({
    state: EditorState.create({ doc: tab.handle.doc().content, extensions: [automerge(accessor)] }),
    parent: document.body.appendChild(document.createElement('div')),
  });
  views.push(view);
  return view;
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the editor's Automerge binding over tab documents", () => {
  test('two editors and another peer type concurrently and converge; comment anchors resolve everywhere', async () => {
    for (const seed of [1, 2, 3]) {
      leaks.length = 0;
      const { rand, pick } = seeded(seed);
      const host = new SpikeHost();
      host.create('doc', { content: 'The quick brown fox.' });
      const network = new Network(host);
      const tabs = [network.open('doc'), network.open('doc')];
      const editors = tabs.map(openEditor);
      await tick();
      let peer = A.clone(host.doc('doc'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
      const anchors: { anchor: string; editor: number }[] = [];

      for (let step = 0; step < 60; step++) {
        const r = rand();
        if (r < 0.55) {
          const index = pick(editors.length);
          const view = editors[index];
          const length = view.state.doc.length;
          const from = pick(length + 1);
          const to = rand() < 0.3 ? Math.min(length, from + 1 + pick(3)) : from;
          view.dispatch({ changes: { from, to, insert: rand() < 0.8 ? 'ab'[pick(2)] : '' }, userEvent: 'input.type' });
          // A comment on what was just typed, before the worker has seen it.
          const text = view.state.doc.length;
          if (text > 2) {
            const start = pick(text - 1);
            anchors.push({
              anchor: Cursor.getCursorFromRange(view.state, { from: start, to: start + 1 }),
              editor: index,
            });
          }
        } else if (r < 0.65) {
          peer = A.change(peer, (d: any) => A.splice(d, ['content'], pick(d.content.length + 1), 0, 'P'));
        } else if (r < 0.75) {
          host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
        } else if (r < 0.8) {
          host.flush();
          peer = A.merge(peer, A.clone(host.doc('doc')));
        } else {
          network.deliver(1 + pick(network.pending + 1));
        }
        await tick();
      }
      network.settle();
      host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
      network.settle();
      await tick();

      const hostDoc = A.load<{ content: string }>(A.save(host.doc('doc')));
      for (const [index, view] of editors.entries()) {
        expect(view.state.doc.toString()).toBe(hostDoc.content);
        expect(tabs[index].handle.doc().content).toBe(hostDoc.content);
      }
      // Every anchor, minted before the worker saw its text, resolves in both editors where
      // Automerge resolves it.
      for (const { anchor } of anchors) {
        const [from, to] = anchor.split(':');
        const want = {
          from: A.getCursorPosition(hostDoc, ['content'], from),
          to: to === 'end' ? hostDoc.content.length : A.getCursorPosition(hostDoc, ['content'], to),
        };
        for (const view of editors) {
          expect(Cursor.getRangeFromCursor(view.state, anchor)).toEqual(want);
        }
      }
      expect(anchors.length).toBeGreaterThan(10);
      expect(leaks).toEqual([]);
    }
  });
});
