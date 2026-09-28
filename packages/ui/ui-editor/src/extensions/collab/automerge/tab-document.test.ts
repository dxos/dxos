//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { afterEach, describe, expect, test } from 'vitest';

import { sleep, waitForCondition } from '@dxos/async';
import type * as Handle from '@dxos/automerge-proxy/Handle';
import { TabHarness, seeded } from '@dxos/automerge-proxy/testing';

import { Cursor } from '../../../util/index.ts';
import { automerge } from './automerge.ts';

type Text = { content: string };

const views: EditorView[] = [];
let harness: TabHarness<Text> | undefined;

afterEach(async () => {
  views.splice(0).forEach((view) => view.destroy());
  await harness?.close();
  harness = undefined;
});

const openEditor = (handle: Handle.DocHandle<Text>): EditorView => {
  const view = new EditorView({
    state: EditorState.create({ doc: handle.doc().content, extensions: [automerge({ handle, path: ['content'] })] }),
    parent: document.body.appendChild(document.createElement('div')),
  });
  views.push(view);
  return view;
};

/** The heads the host's store holds for the document. */
const storedHeads = (harness: TabHarness<Text>) => A.getHeads(harness.store.get<Text>('doc')).join();

describe("the editor's Automerge binding over tab documents", () => {
  test.each([1, 2, 3])(
    'two editors and a peer type concurrently and converge, and anchors resolve where Automerge resolves them (seed %i)',
    async (seed) => {
      harness = new TabHarness<Text>({ seed });
      await harness.open();
      harness.store.put('doc', A.from<Text>({ content: 'The quick brown fox.' }));
      const repos = [await harness.tab(), await harness.tab()];
      const handles = repos.map((repo) => repo.find('doc'));
      await Promise.all(handles.map((handle) => handle.whenReady()));
      const editors = handles.map(openEditor);
      let peer = A.clone(harness.store.get<Text>('doc'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
      const anchors: string[] = [];

      const { rand, pick } = seeded(seed);
      for (let step = 0; step < 60; step++) {
        const roll = rand();
        if (roll < 0.6) {
          const view = editors[pick(editors.length)];
          const length = view.state.doc.length;
          const from = pick(length + 1);
          const to = rand() < 0.3 ? Math.min(length, from + 1 + pick(3)) : from;
          view.dispatch({ changes: { from, to, insert: rand() < 0.8 ? 'ab'[pick(2)] : '' }, userEvent: 'input.type' });
          // An anchor on what was just typed, before the host has seen it.
          const text = view.state.doc.length;
          if (text > 2) {
            const start = pick(text - 1);
            anchors.push(Cursor.getCursorFromRange(view.state, { from: start, to: start + 1 }));
          }
        } else if (roll < 0.75) {
          peer = A.change(peer, (doc) => A.splice(doc, ['content'], pick(doc.content.length + 1), 0, 'P'));
        } else if (roll < 0.9) {
          harness.store.merge('doc', peer);
        } else {
          peer = A.merge(peer, A.clone(harness.store.get<Text>('doc')));
        }
        if (rand() < 0.3) {
          await sleep(pick(4));
        }
      }
      harness.store.merge('doc', peer);
      await Promise.all(repos.map((repo) => repo.flush()));
      const current = harness;
      await waitForCondition({
        condition: () => handles.every((handle) => handle.heads.join() === storedHeads(current)),
        timeout: 10_000,
      });

      const stored = A.load<Text>(A.save(harness.store.get<Text>('doc')));
      for (const [index, view] of editors.entries()) {
        expect(view.state.doc.toString()).toBe(stored.content);
        expect(handles[index].doc().content).toBe(stored.content);
      }
      for (const anchor of anchors) {
        const [from, to] = anchor.split(':');
        const want = {
          from: A.getCursorPosition(stored, ['content'], from),
          to: to === 'end' ? stored.content.length : A.getCursorPosition(stored, ['content'], to),
        };
        for (const view of editors) {
          expect(Cursor.getRangeFromCursor(view.state, anchor)).toEqual(want);
        }
      }
      expect(anchors.length).toBeGreaterThan(10);
    },
  );
});
