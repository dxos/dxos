//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId, interpretAsDocumentId, stringifyAutomergeUrl } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { type DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

import { createTestSqliteRuntime } from '../testing/index.ts';
import { replacementDocumentId } from './document-retirement.ts';
import { EchoHost } from './echo-host.ts';

/** The error the browser worker logged for a 45M-op document, as Automerge raises it. */
const OUT_OF_MEMORY = new RangeError('error inflating document chunk ops: out of memory');

const setup = async () => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const host = new EchoHost({ runtime });
  await host.open(Context.default());
  onTestFinished(async () => {
    await host.close();
    await dispose();
  });

  const spaceId = SpaceId.random();
  const automergeHost = host['_automergeHost'];

  const countChunks = (documentId: DocumentId) =>
    RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const glob = `${documentId}-*`;
        const rows = yield* sql<{ n: number }>`
          SELECT COUNT(*) AS n FROM automerge_chunks WHERE key = ${documentId} OR key GLOB ${glob}
        `;
        return Number(rows[0].n);
      }),
    );

  const indexedDocument = async (objectId: string) => {
    const [meta] = await RuntimeProvider.runPromise(runtime)(
      host.indexEngine.queryObjectIds({ spaceIds: [spaceId], objectIds: [objectId] }),
    );
    return meta?.documentId;
  };

  const createSpace = async () => {
    const root = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: {},
      links: {},
    });
    await host.flush(Context.default());
    await host.updateSpaceRoot(Context.default(), spaceId, root.url);
    return root;
  };

  const createObjectDoc = async (objectId: string, title: string) => {
    using doc = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: { [objectId]: { system: {}, meta: { keys: [] }, data: { title } } },
    });
    return doc.url;
  };

  const loadDirectory = async (documentId: DocumentId) => {
    const handle = await host.loadDoc<DatabaseDirectory>(Context.default(), documentId);
    invariant(handle, `Document is not loadable: ${documentId}`);
    return handle;
  };

  const readDirectory = async (documentId: DocumentId) => {
    const directory = (await loadDirectory(documentId)).doc();
    invariant(directory, `Document is not ready: ${documentId}`);
    return directory;
  };

  const linkObjects = async (rootId: DocumentId, links: Record<string, string>) => {
    const root = await loadDirectory(rootId);
    root.change((draft: DatabaseDirectory) => {
      draft.links ??= {};
      for (const [objectId, url] of Object.entries(links)) {
        draft.links[objectId] = new A.RawString(url);
      }
    });
    await host.flush(Context.default());
    // Past the 50ms debounce of the directory listing.
    await sleep(120);
  };

  return {
    host,
    automergeHost,
    spaceId,
    countChunks,
    indexedDocument,
    createSpace,
    createObjectDoc,
    linkObjects,
    loadDirectory,
    readDirectory,
  };
};

describe('document retirement', () => {
  test('rebuilds a document that ran out of memory from the index and retires it in the space directory', async () => {
    const {
      host,
      automergeHost,
      countChunks,
      indexedDocument,
      createSpace,
      createObjectDoc,
      linkObjects,
      readDirectory,
    } = await setup();
    const root = await createSpace();
    const url = await createObjectDoc('obj-bloated', 'Bloated');
    const documentId = interpretAsDocumentId(url);
    await linkObjects(root.documentId, { 'obj-bloated': url });
    await host.updateIndexes();
    expect(await indexedDocument('obj-bloated')).toBe(documentId);

    await automergeHost.quarantineDocument(documentId, { reason: 'load-failed', error: OUT_OF_MEMORY });

    const replacementId = await replacementDocumentId(documentId);
    const replacementUrl = stringifyAutomergeUrl(replacementId);
    await expect
      .poll(async () => (await readDirectory(root.documentId)).retired?.[documentId]?.replacedBy.toString())
      .toBe(replacementUrl);
    const directory = await readDirectory(root.documentId);
    expect(directory.links?.['obj-bloated']?.toString()).toBe(replacementUrl);

    // The replacement carries the object as the index last saw it.
    const replacement = await readDirectory(replacementId);
    expect(replacement.objects?.['obj-bloated']?.data).toMatchObject({ title: 'Bloated' });

    // The original stays out for good, its bytes gone; the index follows the replacement.
    await expect.poll(() => countChunks(documentId)).toBe(0);
    expect(automergeHost.quarantinedDocuments.get(documentId)?.reason).toBe('retired');
    await host.updateIndexes();
    await expect.poll(() => indexedDocument('obj-bloated')).toBe(replacementId);
  });

  test('keeps a document quarantined, and does not retire it, while the index lacks its objects', async () => {
    const { automergeHost, countChunks, createSpace, createObjectDoc, linkObjects, readDirectory } = await setup();
    const root = await createSpace();
    const url = await createObjectDoc('obj-unindexed', 'Unindexed');
    const documentId = interpretAsDocumentId(url);
    await automergeHost.flush(Context.default());

    // Quarantined before the space links it, so the indexer never reads it.
    await automergeHost.quarantineDocument(documentId, { reason: 'load-failed', error: OUT_OF_MEMORY });
    await linkObjects(root.documentId, { 'obj-unindexed': url });
    await sleep(200);

    const directory = await readDirectory(root.documentId);
    expect(directory.retired).toBeUndefined();
    expect(directory.links?.['obj-unindexed']?.toString()).toBe(url);
    expect(automergeHost.quarantinedDocuments.get(documentId)?.reason).toBe('load-failed');
    // Nothing to rebuild from, so the bytes are the only copy and must survive.
    expect(await countChunks(documentId)).toBeGreaterThan(0);
  });

  test('wipes a document another peer retired, without loading it', async () => {
    const {
      host,
      automergeHost,
      countChunks,
      indexedDocument,
      createSpace,
      createObjectDoc,
      linkObjects,
      loadDirectory,
    } = await setup();
    const root = await createSpace();
    const url = await createObjectDoc('obj-retired', 'Retired');
    const documentId = interpretAsDocumentId(url);
    await linkObjects(root.documentId, { 'obj-retired': url });
    await host.updateIndexes();
    expect(await indexedDocument('obj-retired')).toBe(documentId);
    expect(await countChunks(documentId)).toBeGreaterThan(0);

    // The directory change a retiring peer replicates: the link re-pointed and the retirement recorded.
    const replacementUrl = await createObjectDoc('obj-retired', 'Retired');
    const rootHandle = await loadDirectory(root.documentId);
    rootHandle.change((draft: DatabaseDirectory) => {
      draft.links ??= {};
      draft.links['obj-retired'] = new A.RawString(replacementUrl);
      draft.retired = { [documentId]: { replacedBy: new A.RawString(replacementUrl) } };
    });
    await host.flush(Context.default());

    await expect.poll(() => countChunks(documentId)).toBe(0);
    expect(automergeHost.quarantinedDocuments.get(documentId)?.reason).toBe('retired');
    expect(await automergeHost.loadDoc(Context.default(), documentId)).toBeNull();
    await host.updateIndexes();
    await expect.poll(() => indexedDocument('obj-retired')).toBe(interpretAsDocumentId(replacementUrl));
  });
});
