//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import * as Automerge from './Automerge.ts';
import * as Handle from './Handle.ts';

type Doc = { text: string };

const documentId = 'doc';

/** A proxy handle showing `value`, which its host confirmed at `heads`. */
const proxyOf = (value: Doc, heads: string[]): Handle.DocHandle<Doc> => {
  const handle = new Handle.DocHandle<Doc>({ clientId: 'tab', documentId });
  handle._receive({ type: 'snapshot', documentId, epoch: 'e', version: 0, heads, value });
  return handle;
};

describe('Automerge', () => {
  test('splice and updateText write an Automerge document as Automerge does', () => {
    let doc = A.from<Doc>({ text: 'world' });
    doc = A.change(doc, (draft) => Automerge.splice(draft, ['text'], 0, 0, 'Hi, '));
    doc = A.change(doc, (draft) => Automerge.updateText(draft, ['text'], 'Hi, there'));
    expect(doc.text).toBe('Hi, there');
  });

  test('splice and updateText record the edits on a proxy document', () => {
    const handle = proxyOf({ text: 'world' }, ['h0']);
    handle.change((draft) => Automerge.splice(draft, ['text'], 0, 0, 'Hi, '));
    handle.change((draft) => Automerge.updateText(draft, ['text'], 'Hi, there'));
    expect(handle.doc()).toEqual({ text: 'Hi, there' });
    expect(handle.hasPending).toBe(true);
  });

  test('a proxy draft refuses a cursor position, which only Automerge can resolve', () => {
    const handle = proxyOf({ text: 'world' }, ['h0']);
    expect(() => handle.change((draft) => Automerge.splice(draft, ['text'], 'cursor', 0, 'x'))).toThrow(TypeError);
    expect(handle.doc()).toEqual({ text: 'world' });
  });

  test('a proxy document reports the heads its host confirmed, which lag its unconfirmed edits', () => {
    const handle = proxyOf({ text: 'world' }, ['h0']);
    handle.change((draft) => Automerge.splice(draft, ['text'], 0, 0, 'Hi, '));
    expect(Automerge.getHeads(handle.doc())).toEqual(['h0']);
    expect(Automerge.hasHeads(handle.doc(), ['h0'])).toBe(true);
    expect(Automerge.hasHeads(handle.doc(), ['h1'])).toBe(false);
  });

  test('an Automerge document reports its own heads', () => {
    const doc = A.from<Doc>({ text: 'world' });
    expect(Automerge.getHeads(doc)).toEqual(A.getHeads(doc));
    expect(Automerge.hasHeads(doc, A.getHeads(doc))).toBe(true);
  });

  test('isProxy tells a proxy document from an Automerge one', () => {
    expect(Automerge.isProxy(proxyOf({ text: 'world' }, ['h0']).doc())).toBe(true);
    expect(Automerge.isProxy(A.from<Doc>({ text: 'world' }))).toBe(false);
  });

  test('every other function is Automerge itself', () => {
    expect(Automerge.from).toBe(A.from);
    expect(Automerge.change).toBe(A.change);
    expect(Automerge.diff).toBe(A.diff);
  });
});
