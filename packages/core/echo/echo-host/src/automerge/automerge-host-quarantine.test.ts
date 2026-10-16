//
// Copyright 2026 DXOS.org
//

import { type DocumentId, generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { SpaceId } from '@dxos/keys';

import { createTestSqliteRuntime } from '../testing/index.ts';
import { AutomergeHost } from './automerge-host.ts';
import { DocumentQuarantinedError, isOutOfMemoryError } from './quarantine.ts';
import { deriveCollectionIdFromSpaceId } from './space-collection.ts';

/** The error the browser worker logged for a 45M-op document, as Automerge raises it. */
const OUT_OF_MEMORY = new RangeError('error inflating document chunk ops: out of memory');

const randomDocumentId = (): DocumentId => parseAutomergeUrl(generateAutomergeUrl()).documentId;

const openHost = async (runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>) => {
  const host = new AutomergeHost({ runtime });
  await host.open();
  onTestFinished(async () => {
    if (host.isOpen) {
      await host.close();
    }
  });
  return host;
};

describe('isOutOfMemoryError', () => {
  test('matches the failures that repeat on every load', () => {
    expect(isOutOfMemoryError(OUT_OF_MEMORY)).toBe(true);
    expect(isOutOfMemoryError(new RangeError('WebAssembly.Memory.grow(): Maximum memory size exceeded'))).toBe(true);
    expect(isOutOfMemoryError(new RangeError('Array buffer allocation failed'))).toBe(true);
  });

  test('ignores failures that may not repeat', () => {
    expect(isOutOfMemoryError(new RangeError('unable to parse chunk: invalid magic bytes'))).toBe(false);
    expect(isOutOfMemoryError(new Error('database is locked'))).toBe(false);
    expect(isOutOfMemoryError('out of memory')).toBe(false);
  });
});

describe('AutomergeHost quarantine', () => {
  test('refuses to load a quarantined document, across a restart', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());

    const before = await openHost(runtime);
    const handle = await before.createDoc<{ title: string }>({ title: 'bloated' });
    await before.flush(Context.default());
    const documentId = handle.documentId;
    handle[Symbol.dispose]();

    await before.quarantineDocument(documentId, { reason: 'load-failed', error: OUT_OF_MEMORY });
    expect(await before.loadDoc(Context.default(), documentId)).toBeNull();
    expect(() => before.acquireDoc(documentId)).toThrow(DocumentQuarantinedError);
    await before.close();

    const after = await openHost(runtime);
    expect(after.isQuarantined(documentId)).toBe(true);
    expect(after.quarantinedDocuments.get(documentId)).toMatchObject({
      reason: 'load-failed',
      error: String(OUT_OF_MEMORY),
    });
    expect(await after.loadDoc(Context.default(), documentId)).toBeNull();
  });

  test('retiring a document that failed to load supersedes the failure, across a restart', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const documentId = randomDocumentId();

    const before = await openHost(runtime);
    await before.quarantineDocument(documentId, { reason: 'load-failed', error: OUT_OF_MEMORY });
    await before.quarantineDocument(documentId, { reason: 'retired' });
    // A later load failure never demotes a retirement.
    await before.quarantineDocument(documentId, { reason: 'load-failed', error: OUT_OF_MEMORY });
    expect(before.quarantinedDocuments.get(documentId)?.reason).toBe('retired');
    await before.close();

    const after = await openHost(runtime);
    expect(after.quarantinedDocuments.get(documentId)).toMatchObject({
      reason: 'retired',
      error: String(OUT_OF_MEMORY),
    });
  });

  test('a load waiting on a document resolves as unavailable once the document is quarantined', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = await openHost(runtime);

    // No source can serve this document, so without the quarantine the load would wait forever.
    const documentId = randomDocumentId();
    const pending = host.loadDoc(Context.default(), documentId);
    await sleep(50);

    await host.quarantineDocument(documentId, { reason: 'load-failed', error: OUT_OF_MEMORY });
    expect(await pending).toBeNull();
  });

  test('quarantines a document whose load ran out of memory, and only that one', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = await openHost(runtime);
    const failed = randomDocumentId();
    const malformed = randomDocumentId();

    const repo = host['_repo'];
    repo.emit('document-load-failed', { documentId: failed, error: OUT_OF_MEMORY, source: 'storage' });
    repo.emit('document-load-failed', {
      documentId: malformed,
      error: new RangeError('unable to parse chunk: invalid magic bytes'),
      source: 'storage',
    });

    await expect.poll(() => host.isQuarantined(failed)).toBe(true);
    expect(host.quarantinedDocuments.get(failed)?.reason).toBe('load-failed');
    expect(host.isQuarantined(malformed)).toBe(false);
  });

  test('a document whose stored bytes cannot be applied reports the failure from storage', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());

    const before = await openHost(runtime);
    const handle = await before.createDoc<{ title: string }>({ title: 'corrupt' });
    await before.flush(Context.default());
    const documentId = handle.documentId;
    handle[Symbol.dispose]();
    await before.close();

    // Bytes no Automerge version can parse, standing in for a document too large to load.
    await RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const garbage = new Uint8Array([0x85, 0x6f, 0x4a, 0x83, 1, 2, 3, 4, 0, 9, 9, 9]);
        yield* sql`UPDATE automerge_chunks SET data = ${garbage} WHERE key GLOB ${`${documentId}-*`}`;
      }),
    );

    const host = await openHost(runtime);
    const failures: { documentId: DocumentId; source: string }[] = [];
    host['_repo'].on('document-load-failed', ({ documentId, source }) => failures.push({ documentId, source }));
    await host.loadDoc(Context.default(), documentId, { timeout: 2_000 }).catch(() => null);

    expect(failures).toContainEqual({ documentId, source: 'storage' });
    // Not out of memory, so the next load may succeed: the document stays loadable.
    expect(host.isQuarantined(documentId)).toBe(false);
  });

  test('never advertises a quarantined document to peers', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = await openHost(runtime);
    const collectionId = deriveCollectionIdFromSpaceId(SpaceId.random(), randomDocumentId());
    const kept = randomDocumentId();
    const quarantined = randomDocumentId();

    await host.quarantineDocument(quarantined, { reason: 'retired' });
    await host.updateLocalCollectionState(collectionId, [kept, quarantined]);

    const documents = Object.keys(host.getLocalCollectionState(collectionId)?.documents ?? {});
    expect(documents).toContain(kept);
    expect(documents).not.toContain(quarantined);
  });
});
