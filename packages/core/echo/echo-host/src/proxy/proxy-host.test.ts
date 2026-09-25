//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import * as Handle from '@dxos/automerge-proxy/Handle';
import * as Repo from '@dxos/automerge-proxy/Repo';
import { Transport, createRandom } from '@dxos/automerge-proxy/testing';
import { Context } from '@dxos/context';

import { AutomergeHost } from '../automerge/index.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { createProxyHost } from './proxy-host.ts';

type Doc = { title: string };

describe('createProxyHost', () => {
  test('keeps a document a client edits resident for `residentFor` after the last call, then lets it go', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const automergeHost = new AutomergeHost({ runtime, residency: { evictionDelay: 0 } });
    await automergeHost.open();
    onTestFinished(async () => {
      await automergeHost.close();
    });
    const created = await automergeHost.createDoc<Doc>({ title: 'draft' });
    const { documentId } = created;
    await automergeHost.flush(Context.default());
    created[Symbol.dispose]();
    await automergeHost.drainEvictions();
    expect(automergeHost.loadedDocumentIds).not.toContain(documentId);

    const host = await createProxyHost({ automergeHost, residentFor: 300 }).open();
    onTestFinished(async () => {
      await host.close();
    });
    const repo = await new Repo.ProxyRepo({
      host: new Transport({ host: () => host, random: createRandom(1).next }),
      createHandle: (options) => new Handle.DocHandle(options),
    }).open();
    onTestFinished(async () => {
      await repo.close();
    });

    const handle = repo.find(documentId);
    await handle.whenReady();
    handle.change((doc: Doc) => {
      doc.title = 'final';
    });
    await repo.flush();
    expect(automergeHost.loadedDocumentIds).toContain(documentId);
    await expect.poll(() => automergeHost.loadedDocumentIds.includes(documentId), { timeout: 5_000 }).toBe(false);

    // The client still follows the document, so its next edit loads it again.
    handle.change((doc: Doc) => {
      doc.title = 'again';
    });
    await repo.flush();
    expect(automergeHost.loadedDocumentIds).toContain(documentId);
    using lease = await automergeHost.loadDoc<Doc>(Context.default(), documentId);
    expect(lease?.doc()?.title).toBe('again');
  });
});
