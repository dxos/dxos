//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocumentId,
  generateAutomergeUrl,
  interpretAsDocumentId,
  parseAutomergeUrl,
  stringifyAutomergeUrl,
} from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { type DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { invariant } from '@dxos/invariant';
import { SpaceId, URI } from '@dxos/keys';

import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost, buildReplacementDocument, replacementDocumentId } from './echo-host.ts';

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
    // A plain string, not a CRDT text: a reason is written once and only ever read whole.
    expect(directory.retired?.[documentId]?.reason).toBeInstanceOf(A.RawString);
    expect(String(directory.retired?.[documentId]?.reason)).toBe('load-failed');

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

describe('concurrent retirement', () => {
  test('retires several documents that fail at once, and restores all their entries if a merge drops them', async () => {
    const {
      host,
      automergeHost,
      countChunks,
      createSpace,
      createObjectDoc,
      linkObjects,
      loadDirectory,
      readDirectory,
    } = await setup();
    const root = await createSpace();
    const objectIds = ['obj-a', 'obj-b', 'obj-c'];
    const urls = await Promise.all(objectIds.map((objectId) => createObjectDoc(objectId, objectId)));
    await linkObjects(root.documentId, Object.fromEntries(objectIds.map((objectId, index) => [objectId, urls[index]])));
    await host.updateIndexes();
    const documentIds = urls.map((url) => interpretAsDocumentId(url));
    const replacementUrls = await Promise.all(
      documentIds.map(async (documentId) => stringifyAutomergeUrl(await replacementDocumentId(documentId))),
    );
    const retiredEntries = async () => {
      const directory = await readDirectory(root.documentId);
      return documentIds.map((documentId) => directory.retired?.[documentId]?.replacedBy.toString());
    };

    await Promise.all(
      documentIds.map((documentId) =>
        automergeHost.quarantineDocument(documentId, { reason: 'load-failed', error: OUT_OF_MEMORY }),
      ),
    );
    await expect.poll(retiredEntries).toEqual(replacementUrls);
    const directory = await readDirectory(root.documentId);
    expect(objectIds.map((objectId) => directory.links?.[objectId]?.toString())).toEqual(replacementUrls);
    for (const documentId of documentIds) {
      await expect.poll(() => countChunks(documentId)).toBe(0);
    }

    // Peers that each created the `retired` map concurrently: the merge kept a map without these entries.
    (await loadDirectory(root.documentId)).change((draft: DatabaseDirectory) => {
      delete draft.retired;
    });
    await linkObjects(root.documentId, { 'obj-other': await createObjectDoc('obj-other', 'Other') });
    await expect.poll(retiredEntries).toEqual(replacementUrls);
  });

  test('restores a retirement entry a concurrent change dropped from the directory', async () => {
    const { host, automergeHost, createSpace, createObjectDoc, linkObjects, loadDirectory, readDirectory } =
      await setup();
    const root = await createSpace();
    const url = await createObjectDoc('obj-bloated', 'Bloated');
    const documentId = interpretAsDocumentId(url);
    await linkObjects(root.documentId, { 'obj-bloated': url });
    await host.updateIndexes();
    await automergeHost.quarantineDocument(documentId, { reason: 'load-failed', error: OUT_OF_MEMORY });
    await expect.poll(async () => (await readDirectory(root.documentId)).retired?.[documentId]).toBeDefined();

    // Another peer created its own `retired` map at the same time, and the merge kept that one.
    (await loadDirectory(root.documentId)).change((draft: DatabaseDirectory) => {
      delete draft.retired;
    });
    await linkObjects(root.documentId, { 'obj-other': await createObjectDoc('obj-other', 'Other') });

    const replacementUrl = stringifyAutomergeUrl(await replacementDocumentId(documentId));
    await expect
      .poll(async () => (await readDirectory(root.documentId)).retired?.[documentId]?.replacedBy.toString())
      .toBe(replacementUrl);
  });

  test("keeps a replacement another peer's retirement already delivered", async () => {
    const { host, automergeHost, spaceId, createSpace, createObjectDoc, linkObjects, readDirectory } = await setup();
    const root = await createSpace();
    const url = await createObjectDoc('obj-bloated', 'Bloated');
    const documentId = interpretAsDocumentId(url);
    await linkObjects(root.documentId, { 'obj-bloated': url });
    await host.updateIndexes();

    const replacementId = await replacementDocumentId(documentId);
    const delivered = A.change(A.init<DatabaseDirectory>(), (draft) =>
      Object.assign(draft, {
        version: SpaceDocVersion.CURRENT,
        access: { spaceId },
        objects: { 'obj-bloated': { system: {}, meta: { keys: [] }, data: { title: 'From a peer' } } },
      }),
    );
    using _delivered = await host.createDoc<DatabaseDirectory>(delivered, {
      preserveHistory: true,
      documentId: replacementId,
    });
    await host.flush(Context.default());

    await automergeHost.quarantineDocument(documentId, { reason: 'load-failed', error: OUT_OF_MEMORY });
    await expect.poll(async () => (await readDirectory(root.documentId)).retired?.[documentId]).toBeDefined();

    const replacement = await readDirectory(replacementId);
    expect(replacement.objects?.['obj-bloated']?.data).toMatchObject({ title: 'From a peer' });
    expect(A.getHistory(replacement)).toHaveLength(1);
  });

  test('peers that rebuild the same state build the same replacement', async () => {
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    const directory = (title: string): DatabaseDirectory => ({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId: SpaceId.random() },
      objects: { 'obj-a': { system: {}, meta: { keys: [] }, data: { title, count: 1 } } },
    });
    const same = directory('Same');

    const first = await buildReplacementDocument(documentId, same);
    const second = await buildReplacementDocument(documentId, structuredClone(same));
    const other = await buildReplacementDocument(documentId, directory('Other'));
    expect(A.save(second)).toEqual(A.save(first));
    expect(A.getHeads(other)).not.toEqual(A.getHeads(first));
    // Merging two identical rebuilds adds nothing; merging differing ones keeps a single value per key.
    expect(A.getHistory(A.merge(A.clone(first), second))).toHaveLength(1);
    const merged = A.merge(A.clone(first), other);
    expect(A.getHistory(merged)).toHaveLength(2);
    expect(A.merge(A.clone(other), first).objects).toEqual(merged.objects);
  });
});

describe('history retirement', () => {
  const CURSOR_TYPE = URI.make('dxn:org.dxos.type.cursor:0.2.0');

  /**
   * Writes a document whose history is several times its state by replacing one long string again and again,
   * the way the unfixed `Cursor.writeSnapshot` replaced its snapshot map; then restarts, so it loads from disk.
   */
  const bloatAndRestart = async (type: ReturnType<typeof URI.make> | undefined) => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const spaceId = SpaceId.random();
    const openHost = async (rootUrl?: AutomergeUrl) => {
      const host = new EchoHost({ runtime });
      await host.open(Context.default());
      onTestFinished(async () => {
        if (host.isOpen) {
          await host.close();
        }
      });
      if (rootUrl) {
        await host.updateSpaceRoot(Context.default(), spaceId, rootUrl);
      }
      return host;
    };

    const before = await openHost();
    using root = await before.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: {},
      links: {},
    });
    await before.flush(Context.default());
    await before.updateSpaceRoot(Context.default(), spaceId, root.url);
    using doc = await before.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: {
        'obj-cursor': { system: type ? { type: { '/': type } } : {}, meta: { keys: [] }, data: { state: '' } },
      },
    });
    for (let write = 0; write < 6; write++) {
      doc.change((draft: DatabaseDirectory) => {
        const cursor = draft.objects?.['obj-cursor'];
        invariant(cursor, 'Cursor object is missing.');
        cursor.data.state = `${write}`.repeat(30_000);
      });
    }
    root.change((draft: DatabaseDirectory) => {
      draft.links ??= {};
      draft.links['obj-cursor'] = new A.RawString(doc.url);
    });
    await before.flush(Context.default());
    await sleep(120);
    await before.updateIndexes();
    const documentId = doc.documentId;
    const rootId = root.documentId;
    await before.close();

    const rootUrl = root.url;
    const host = await openHost(rootUrl);
    // The load from disk is what reports the document's size.
    expect(await host.loadDoc(Context.default(), documentId)).not.toBeNull();
    const readRoot = async () => {
      const handle = await host.loadDoc<DatabaseDirectory>(Context.default(), rootId);
      invariant(handle, 'Root is not loadable.');
      return handle.doc();
    };
    return { host, documentId, readRoot, reopen: () => openHost(rootUrl) };
  };

  test('rebuilds a cursor whose history outgrew its state, from its own current state', async () => {
    const { host, documentId, readRoot, reopen } = await bloatAndRestart(CURSOR_TYPE);
    const replacementId = await replacementDocumentId(documentId);
    await expect
      .poll(async () => (await readRoot())?.retired?.[documentId]?.replacedBy.toString(), { timeout: 10_000 })
      .toBe(stringifyAutomergeUrl(replacementId));
    expect(String((await readRoot())?.retired?.[documentId]?.reason)).toBe('history');

    const replacement = await host.loadDoc<DatabaseDirectory>(Context.default(), replacementId);
    invariant(replacement, 'Replacement is not loadable.');
    expect(replacement.doc()?.objects?.['obj-cursor']?.data).toEqual({ state: '5'.repeat(30_000) });
    expect(A.stats(replacement.doc()).numOps).toBeLessThan(40_000);

    // Nothing but the space directory records the retirement, and it is enough to keep the document out.
    await host.close();
    const after = await reopen();
    const afterAutomergeHost = after['_automergeHost'];
    await expect.poll(() => afterAutomergeHost.quarantinedDocuments.get(documentId)?.reason).toBe('retired');
    expect(await after.loadDoc(Context.default(), documentId)).toBeNull();
  });

  test('leaves a bloated document of any other type alone', async () => {
    const { documentId, readRoot } = await bloatAndRestart(undefined);
    await sleep(500);
    expect((await readRoot())?.retired?.[documentId]).toBeUndefined();
  });
});
