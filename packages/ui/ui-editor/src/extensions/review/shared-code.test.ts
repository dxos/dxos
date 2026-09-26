//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { afterEach, describe, expect, test } from 'vitest';

import * as Automerge from '@dxos/automerge-proxy/Automerge';
import { TabHarness, canon } from '@dxos/automerge-proxy/testing';
import { getRangeFromCursor, toCursorRange } from '@dxos/echo-client';
import { Doc, applyEdits } from '@dxos/echo-doc';

import { cherryPickHunk } from './diff.ts';

type Text = { content: string };

/** EDGE's handle: its functions runtime holds Automerge documents, which the namespace passes through. */
class ReplicaHandle implements Doc.Handle<Text> {
  #doc: A.Doc<Text>;

  constructor(doc: A.Doc<Text>) {
    this.#doc = doc;
  }

  doc(): A.Doc<Text> {
    return this.#doc;
  }

  change(callback: (doc: Text) => void): void {
    this.#doc = A.change(this.#doc, callback);
  }

  changeAt(heads: A.Heads, callback: (doc: Text) => void): A.Heads | undefined {
    const { newDoc, newHeads } = A.changeAt(this.#doc, heads, callback);
    this.#doc = newDoc;
    return newHeads ?? undefined;
  }

  addListener(): void {}

  removeListener(): void {}
}

/** The core of plugin-markdown's accept-change operation, as it runs in either realm. */
const acceptChange = (accessor: Doc.Accessor<Text>, anchor: string, compare: string) => {
  const range = getRangeFromCursor(accessor, anchor);
  const splice = range && cherryPickHunk(Doc.getValue<string>(accessor), compare, range);
  if (splice) {
    accessor.handle.change((doc) =>
      Automerge.splice(doc, accessor.path.slice(), splice.from, splice.del, splice.insert),
    );
  }
  return splice;
};

let harness: TabHarness<Text> | undefined;

afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

describe('shared operation code in both realms', () => {
  test("echo-doc and plugin-markdown text writes run unmodified on EDGE's Automerge handle and on a tab handle", async () => {
    harness = new TabHarness<Text>();
    await harness.open();
    harness.store.put(
      'doc',
      A.from<Text>({
        content: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.',
      }),
    );
    const repo = await harness.tab();
    const tab = repo.find('doc');
    await tab.whenReady();
    const edge = new ReplicaHandle(
      A.clone(harness.store.get<Text>('doc'), { actor: 'edee0000edee0000edee0000edee0000' }),
    );
    const accessors: Doc.Accessor<Text>[] = [
      { handle: edge, path: ['content'] },
      { handle: tab, path: ['content'] },
    ];

    // echo-doc's find and replace.
    const edits = [
      { oldString: 'quick', newString: 'slow' },
      { oldString: 'o', newString: '0', replaceAll: true },
    ];
    const [onEdge, inTab] = accessors.map((accessor) => applyEdits(accessor, edits));
    expect(inTab).toBe(onEdge);
    expect(onEdge).toBe('The sl0w br0wn f0x jumps 0ver the lazy d0g. Pack my b0x with five d0zen liqu0r jugs.');

    // plugin-markdown's accept-change: an anchor over a word, then the compare text's version of it.
    const at = onEdge.indexOf('d0zen');
    const splices = accessors.map((accessor) =>
      acceptChange(accessor, toCursorRange(accessor, at, at + 5), onEdge.replace('d0zen', 'hundred')),
    );
    expect(splices[1]).toEqual(splices[0]);
    expect(accessors.map((accessor) => Doc.getValue<string>(accessor))).toEqual([
      onEdge.replace('d0zen', 'hundred'),
      onEdge.replace('d0zen', 'hundred'),
    ]);

    // EDGE's changes reach the host by sync and the tab's through the tab protocol; all converge.
    await repo.flush();
    harness.store.merge('doc', edge.doc());
    const current = harness;
    const stored = () => A.getHeads(current.store.get<Text>('doc')).join();
    await expect.poll(() => tab.heads.join() === stored(), { timeout: 5_000 }).toBe(true);
    expect(canon(tab.doc())).toBe(canon(A.toJS(A.load(A.save(harness.store.get<Text>('doc'))))));
  });
});
