//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { Contract, Op } from '@dxos/automerge-proxy';
import { invariant } from '@dxos/invariant';

import { MirrorCursors } from './mirror-cursors.ts';
import { MirrorDocHandle } from './mirror-doc-handle.ts';
import { recordSplice } from './recorder.ts';

const documentId = 'cursor-doc' as DocumentId;

/** A handle fed by hand with the events a worker would send. */
const createHandle = (value: Record<string, unknown>) => {
  const handle = new MirrorDocHandle<Record<string, unknown>>({ clientId: 'tab', documentId, onDelete: () => {} });
  handle._receive({ type: 'snapshot', documentId, epoch: 'epoch', version: 0, heads: ['h0'], value });
  let version = 0;
  const receive = (ops: Op.Any[], origin?: Contract.Entry['origin']) => {
    version++;
    handle._receive({
      type: 'entry',
      documentId,
      epoch: 'epoch',
      entry: { version, ops, heads: [`h${version}`], ...(origin ? { origin } : {}) },
    });
  };
  return { handle, receive };
};

/** A worker that knows the confirmed text and answers with positions for cursors named `c<position>`. */
const createService = (requests: { path: Op.Path; positions: number[] }[] = []) => ({
  resolve: async (_path: Op.Path, _heads: string[], cursors: string[]) =>
    cursors.map((cursor) => Number(cursor.slice(1))),
  create: async (path: Op.Path, _heads: string[], positions: number[]) => {
    requests.push({ path, positions });
    return positions.map((position) => `c${position}`);
  },
});

describe('MirrorCursors', () => {
  test('create moves the requested positions through changes that arrive while it waits', async () => {
    const { handle, receive } = createHandle({ text: 'abc' });
    handle.change((doc) => {
      recordSplice(doc, ['text'], 3, 0, 'XY');
    });
    const requests: { path: Op.Path; positions: number[] }[] = [];
    const cursors = new MirrorCursors(handle, ['text'], createService(requests));

    // Position 4 is 'Y', which only this tab has seen, so creation waits for the confirmation.
    const created = cursors.create([4]);
    const next = handle._takeBatch();
    invariant(next, 'no batch');
    receive([{ type: 'splice', path: ['text'], index: 0, remove: 0, insert: '123' }]);
    receive([{ type: 'splice', path: ['text'], index: 6, remove: 0, insert: 'XY' }], {
      clientId: 'tab',
      batchId: next.batch.batchId,
    });
    await created;

    const text = Op.getAt(handle.doc(), ['text']);
    expect(text).toBe('123abcXY');
    expect(requests[0].positions).toEqual([7]);
    expect(String(text)[requests[0].positions[0]]).toBe('Y');
  });

  test('a tracked position follows its text when a list edit above it moves the text', async () => {
    const { handle, receive } = createHandle({ items: [{ title: 'zero' }, { title: 'hello world' }] });
    const cursors = new MirrorCursors(handle, ['items', 1, 'title'], createService());
    await cursors.track(['c6']);
    expect(cursors.position('c6')).toBe(6);

    // Another writer inserts an item before it, then edits the moved text.
    receive([{ type: 'insert', path: ['items', 0], values: [{ title: 'new' }] }]);
    receive([{ type: 'splice', path: ['items', 2, 'title'], index: 0, remove: 0, insert: '>> ' }]);
    expect(cursors.position('c6')).toBe(9);
    expect(String(Op.getAt(handle.doc(), ['items', 2, 'title']))[9]).toBe('w');

    // Removing the item that holds the text leaves the cursor without a position.
    receive([{ type: 'remove', path: ['items', 2], count: 1 }]);
    expect(cursors.position('c6')).toBeUndefined();
  });

  test('tracking resolves against the confirmed path when an unconfirmed edit moved the text', async () => {
    const { handle } = createHandle({ items: [{ title: 'zero' }, { title: 'hello world' }] });
    handle.change((doc) => {
      const items = Reflect.get(doc, 'items');
      invariant(Array.isArray(items), 'items is not a list');
      items.unshift({ title: 'local' });
    });
    const paths: Op.Path[] = [];
    const service = createService();
    const cursors = new MirrorCursors(handle, ['items', 2, 'title'], {
      ...service,
      resolve: async (path, heads, cursorIds) => {
        paths.push(path);
        return service.resolve(path, heads, cursorIds);
      },
    });
    await cursors.track(['c6']);
    expect(paths).toEqual([['items', 1, 'title']]);
    expect(cursors.position('c6')).toBe(6);
  });

  test('a rebuild of the document leaves tracked cursors without a position', async () => {
    const { handle } = createHandle({ text: 'hello' });
    const cursors = new MirrorCursors(handle, ['text'], createService());
    await cursors.track(['c2']);
    expect(cursors.position('c2')).toBe(2);
    handle._receive({
      type: 'snapshot',
      documentId,
      epoch: 'other',
      version: 0,
      heads: ['h9'],
      value: { text: 'bye' },
    });
    expect(cursors.position('c2')).toBeUndefined();
  });
});
