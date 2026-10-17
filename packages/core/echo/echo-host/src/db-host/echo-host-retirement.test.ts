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
import { SpaceId } from '@dxos/keys';

import { documentIdToSedimentreeIdHex } from '../automerge/index.ts';
import { RETIREMENT_MIN_OPS } from '../automerge/quarantine.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost } from './echo-host.ts';
import { buildReplacementDocument, replacementDocumentId } from './retirement.ts';

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

  /** `bloated` pads the object to {@link RETIREMENT_MIN_OPS} ops, one per character, so it is big enough to retire. */
  const createObjectDoc = async (objectId: string, title: string, { bloated = false } = {}) => {
    const data = bloated ? { title, padding: 'x'.repeat(RETIREMENT_MIN_OPS) } : { title };
    using doc = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: { [objectId]: { system: {}, meta: { keys: [] }, data } },
    });
    return doc.url;
  };

  /** Reports that loading the document ran out of memory, as automerge-repo does. */
  const failToLoad = (documentId: DocumentId) =>
    automergeHost['_repo'].emit('document-load-failed', { documentId, error: OUT_OF_MEMORY, source: 'storage' });

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
    runtime,
    host,
    automergeHost,
    spaceId,
    countChunks,
    indexedDocument,
    createSpace,
    createObjectDoc,
    failToLoad,
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
      failToLoad,
      linkObjects,
      readDirectory,
    } = await setup();
    const root = await createSpace();
    const url = await createObjectDoc('obj-bloated', 'Bloated', { bloated: true });
    const documentId = interpretAsDocumentId(url);
    await linkObjects(root.documentId, { 'obj-bloated': url });
    await host.updateIndexes();
    expect(await indexedDocument('obj-bloated')).toBe(documentId);

    failToLoad(documentId);

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
    expect(automergeHost.isQuarantined(documentId)).toBe(true);
    expect(automergeHost.unloadableDocuments.has(documentId)).toBe(false);
    await host.updateIndexes();
    await expect.poll(() => indexedDocument('obj-bloated')).toBe(replacementId);
  });

  test('leaves a small document that ran out of memory alone', async () => {
    const { host, automergeHost, countChunks, createSpace, createObjectDoc, failToLoad, linkObjects, readDirectory } =
      await setup();
    const root = await createSpace();
    const url = await createObjectDoc('obj-small', 'Small');
    const documentId = interpretAsDocumentId(url);
    await linkObjects(root.documentId, { 'obj-small': url });
    await host.updateIndexes();

    // Once the heap is exhausted every load fails this way, so a small document is a bystander.
    failToLoad(documentId);
    await sleep(200);

    expect((await readDirectory(root.documentId)).retired).toBeUndefined();
    expect(automergeHost.unloadableDocuments.has(documentId)).toBe(false);
    expect(automergeHost.isQuarantined(documentId)).toBe(false);
    expect(await countChunks(documentId)).toBeGreaterThan(0);
  });

  test('does not retire a document, or quarantine it, while the index lacks its objects', async () => {
    const {
      runtime,
      host,
      automergeHost,
      spaceId,
      countChunks,
      createSpace,
      createObjectDoc,
      failToLoad,
      linkObjects,
      readDirectory,
    } = await setup();
    const root = await createSpace();
    const url = await createObjectDoc('obj-unindexed', 'Unindexed', { bloated: true });
    const documentId = interpretAsDocumentId(url);
    await automergeHost.flush(Context.default());
    // A bad checksum: Automerge refuses the bytes, so the indexer never reads them, but their ops still count.
    await RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        // Both copies: the classical chunks and Subduction's blobs.
        const glob = `${documentId}-*`;
        const subductionGlob = `subduction-*-${documentIdToSedimentreeIdHex(documentId)}-*`;
        const rows = yield* sql<{ key: string; data: Uint8Array }>`
          SELECT key, data FROM automerge_chunks WHERE key GLOB ${glob} OR key GLOB ${subductionGlob}
        `;
        for (const { key, data } of rows) {
          const corrupt = new Uint8Array(data);
          corrupt[4] ^= 0xff;
          yield* sql`UPDATE automerge_chunks SET data = ${corrupt} WHERE key = ${key}`;
        }
      }),
    );
    // Evicted, and dropped from the index, so every later read goes to the corrupted bytes.
    await automergeHost['_repo'].removeFromCache(documentId);
    await RuntimeProvider.runPromise(runtime)(
      host.indexEngine.deleteObjects({ spaceId, documentIds: [documentId], objects: [] }),
    );

    await linkObjects(root.documentId, { 'obj-unindexed': url });
    failToLoad(documentId);
    await expect.poll(() => automergeHost.unloadableDocuments.has(documentId)).toBe(true);
    await sleep(200);

    const directory = await readDirectory(root.documentId);
    expect(directory.retired).toBeUndefined();
    expect(directory.links?.['obj-unindexed']?.toString()).toBe(url);
    expect(automergeHost.isQuarantined(documentId)).toBe(false);
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
    expect(automergeHost.isQuarantined(documentId)).toBe(true);
    expect(await automergeHost.loadDoc(Context.default(), documentId)).toBeNull();
    await host.updateIndexes();
    await expect.poll(() => indexedDocument('obj-retired')).toBe(interpretAsDocumentId(replacementUrl));
  });

  test('ignores retirements naming a document another space or a live link still uses', async () => {
    const { host, countChunks, createSpace, createObjectDoc, linkObjects, loadDirectory } = await setup();
    const root = await createSpace();
    const linkedUrl = await createObjectDoc('obj-linked', 'Linked');
    const retiredUrl = await createObjectDoc('obj-retired', 'Retired');
    await linkObjects(root.documentId, { 'obj-linked': linkedUrl, 'obj-retired': retiredUrl });

    // Another space on this host, whose document a member of the first space names.
    const otherSpaceId = SpaceId.random();
    const otherRoot = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId: otherSpaceId },
      objects: {},
      links: {},
    });
    await host.flush(Context.default());
    await host.updateSpaceRoot(Context.default(), otherSpaceId, otherRoot.url);
    const otherUrl = await createObjectDoc('obj-other', 'Other');
    // Indexed under the other space, then unlinked: how a document of a directory this host has not opened looks.
    using indexedDoc = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId: otherSpaceId },
      objects: { 'obj-indexed': { system: {}, meta: { keys: [] }, data: { title: 'Indexed' } } },
    });
    const indexedUrl = indexedDoc.url;
    await linkObjects(otherRoot.documentId, { 'obj-other': otherUrl, 'obj-indexed': indexedUrl });
    await host.updateIndexes();
    const otherHandle = await loadDirectory(otherRoot.documentId);
    otherHandle.change((draft: DatabaseDirectory) => {
      delete draft.links?.['obj-indexed'];
    });
    await host.flush(Context.default());

    const replacementUrl = await createObjectDoc('obj-retired', 'Retired');
    const rootHandle = await loadDirectory(root.documentId);
    rootHandle.change((draft: DatabaseDirectory) => {
      draft.links ??= {};
      draft.links['obj-retired'] = new A.RawString(replacementUrl);
      draft.retired = Object.fromEntries(
        [retiredUrl, linkedUrl, otherUrl, indexedUrl, root.url, otherRoot.url].map((url) => [
          interpretAsDocumentId(url),
          { replacedBy: new A.RawString(replacementUrl) },
        ]),
      );
    });
    await host.flush(Context.default());

    // The one genuine retirement goes; every document another space or a live link uses stays.
    await expect.poll(() => countChunks(interpretAsDocumentId(retiredUrl))).toBe(0);
    for (const url of [linkedUrl, otherUrl, indexedUrl, root.url, otherRoot.url]) {
      expect(await countChunks(interpretAsDocumentId(url))).toBeGreaterThan(0);
      expect(host['_automergeHost'].quarantinedDocuments.has(interpretAsDocumentId(url))).toBe(false);
    }
  });
});

describe('concurrent retirement', () => {
  test('retires several documents that fail at once, and restores all their entries if a merge drops them', async () => {
    const { host, countChunks, createSpace, createObjectDoc, failToLoad, linkObjects, loadDirectory, readDirectory } =
      await setup();
    const root = await createSpace();
    const objectIds = ['obj-a', 'obj-b', 'obj-c'];
    const urls = await Promise.all(objectIds.map((objectId) => createObjectDoc(objectId, objectId, { bloated: true })));
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

    for (const documentId of documentIds) {
      failToLoad(documentId);
    }
    // Each rebuild writes a 500K-op replacement.
    await expect.poll(retiredEntries, { timeout: 15_000 }).toEqual(replacementUrls);
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
    const { host, createSpace, createObjectDoc, failToLoad, linkObjects, loadDirectory, readDirectory } = await setup();
    const root = await createSpace();
    const url = await createObjectDoc('obj-bloated', 'Bloated', { bloated: true });
    const documentId = interpretAsDocumentId(url);
    await linkObjects(root.documentId, { 'obj-bloated': url });
    await host.updateIndexes();
    failToLoad(documentId);
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
    const { host, spaceId, createSpace, createObjectDoc, failToLoad, linkObjects, readDirectory } = await setup();
    const root = await createSpace();
    const url = await createObjectDoc('obj-bloated', 'Bloated', { bloated: true });
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

    failToLoad(documentId);
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

describe('retirement across restarts', () => {
  test('the space directory alone keeps a retired document quarantined after a restart', async () => {
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
        'obj-bloated': { system: {}, meta: { keys: [] }, data: { padding: 'x'.repeat(RETIREMENT_MIN_OPS) } },
      },
    });
    root.change((draft: DatabaseDirectory) => {
      draft.links ??= {};
      draft.links['obj-bloated'] = new A.RawString(doc.url);
    });
    await before.flush(Context.default());
    await sleep(120);
    await before.updateIndexes();
    const documentId = doc.documentId;
    before['_automergeHost']['_repo'].emit('document-load-failed', {
      documentId,
      error: OUT_OF_MEMORY,
      source: 'storage',
    });
    const readRoot = async () => {
      const handle = await before.loadDoc<DatabaseDirectory>(Context.default(), root.documentId);
      invariant(handle, 'Root is not loadable.');
      return handle.doc();
    };
    await expect.poll(async () => (await readRoot())?.retired?.[documentId]).toBeDefined();
    await before.close();

    // Nothing but the space directory records the retirement, and it is enough to keep the document out.
    const after = await openHost(root.url);
    await expect.poll(() => after['_automergeHost'].isQuarantined(documentId)).toBe(true);
    expect(await after.loadDoc(Context.default(), documentId)).toBeNull();
  });
});
