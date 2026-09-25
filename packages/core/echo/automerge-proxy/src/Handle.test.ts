//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import * as Handle from './Handle.ts';

const documentId = 'doc';

describe('Handle.DocHandle', () => {
  test('a second answer to a resent subscription leaves the batch in flight to its acknowledgement', () => {
    const handle = new Handle.DocHandle<{ list: string[] }>({ clientId: 'tab', documentId });
    handle._receive({ type: 'snapshot', documentId, epoch: 'e', version: 0, heads: ['h0'], value: { list: [] } });
    handle.change((doc) => {
      doc.list.push('a');
    });
    const next = handle._takeBatch();
    invariant(next, 'no batch');

    // The repo resent `updateSubscription` after losing its response; the host answered both.
    handle._receive({ type: 'snapshot', documentId, epoch: 'e', version: 0, heads: ['h0'], value: { list: [] } });
    handle._receive({
      type: 'entry',
      documentId,
      epoch: 'e',
      entry: {
        version: 1,
        ops: [{ type: 'insert', path: ['list', 0], values: ['a'] }],
        heads: ['h1'],
        origin: { clientId: 'tab', batchId: next.batch.batchId },
      },
    });

    expect(handle.doc()).toEqual({ list: ['a'] });
    expect(handle.hasPending).toBe(false);
    expect(handle._takeBatch()).toBeUndefined();
  });
});
