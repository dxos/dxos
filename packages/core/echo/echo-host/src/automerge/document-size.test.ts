//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Context } from '@dxos/context';
import { log } from '@dxos/log';

import { createTestSqliteRuntime } from '../testing/index.ts';
import { AutomergeHost } from './automerge-host.ts';
import { OVERSIZED_DOCUMENT_CHANGES, OVERSIZED_DOCUMENT_OPS, oversizeLevel } from './document-size.ts';

describe('oversizeLevel', () => {
  test('is below zero within both limits', () => {
    expect(oversizeLevel({ changes: 0, ops: 0 })).toBe(-1);
    expect(oversizeLevel({ changes: OVERSIZED_DOCUMENT_CHANGES - 1, ops: OVERSIZED_DOCUMENT_OPS - 1 })).toBe(-1);
  });

  test('counts doublings past whichever limit is exceeded further', () => {
    expect(oversizeLevel({ changes: OVERSIZED_DOCUMENT_CHANGES, ops: 0 })).toBe(0);
    expect(oversizeLevel({ changes: 0, ops: OVERSIZED_DOCUMENT_OPS * 2 })).toBe(1);
    expect(oversizeLevel({ changes: OVERSIZED_DOCUMENT_CHANGES * 3, ops: OVERSIZED_DOCUMENT_OPS })).toBe(1);
  });

  test('flags the cursor that ran out of memory, which had few changes and many ops', () => {
    expect(oversizeLevel({ changes: 156, ops: 45_722_122 })).toBe(5);
  });
});

describe('AutomergeHost oversized documents', () => {
  test('warns when a saved document passes the op limit, and again only when it doubles', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new AutomergeHost({ runtime });
    await host.open();
    onTestFinished(async () => {
      await host.close();
    });
    const warn = vi.spyOn(log, 'warn');
    onTestFinished(() => warn.mockRestore());
    const reportedOps = () =>
      warn.mock.calls.flatMap(([message, context]: unknown[]) =>
        message === 'oversized automerge document' &&
        typeof context === 'object' &&
        context !== null &&
        'ops' in context
          ? [context.ops]
          : [],
      );

    using _small = await host.createDoc<{ text: string }>({ text: 'small' });
    // One op per character, so this string alone passes the op limit.
    using large = await host.createDoc<{ text: string; edits?: number }>({
      text: 'x'.repeat(OVERSIZED_DOCUMENT_OPS + 100_000),
    });
    await host.flush(Context.default());
    expect(reportedOps()).toEqual([OVERSIZED_DOCUMENT_OPS + 100_001]);

    large.change((doc) => {
      doc.edits = 1;
    });
    await host.flush(Context.default());
    expect(reportedOps()).toHaveLength(1);

    // Replacing the whole string re-inserts every character, the growth pattern this warning exists to catch.
    large.change((doc) => {
      doc.text = `${doc.text}y`;
    });
    await host.flush(Context.default());
    expect(reportedOps()).toHaveLength(2);
  });

  test('warns when an oversized document is loaded from disk, however it is loaded', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const before = new AutomergeHost({ runtime });
    await before.open();
    const created = await before.createDoc<{ text: string }>({ text: 'x'.repeat(OVERSIZED_DOCUMENT_OPS + 100_000) });
    await before.flush(Context.default());
    const documentId = created.documentId;
    created[Symbol.dispose]();
    await before.close();

    const warn = vi.spyOn(log, 'warn');
    onTestFinished(() => warn.mockRestore());
    const host = new AutomergeHost({ runtime });
    await host.open();
    onTestFinished(async () => {
      await host.close();
    });
    // A bare lease, as the indexer takes, rather than `loadDoc`.
    using lease = host.acquireDoc<{ text: string }>(documentId);
    await expect.poll(() => lease.doc()?.text?.length).toBe(OVERSIZED_DOCUMENT_OPS + 100_000);
    expect(
      warn.mock.calls.filter(
        ([message, context]: unknown[]) =>
          message === 'oversized automerge document' &&
          typeof context === 'object' &&
          context !== null &&
          'documentId' in context &&
          context.documentId === documentId,
      ),
    ).toHaveLength(1);
  });
});
