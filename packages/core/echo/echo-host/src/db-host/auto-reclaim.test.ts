//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import * as SqlError from 'effect/unstable/sql/SqlError';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { type DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';

import { documentIdToSedimentreeIdHex } from '../automerge/index.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost } from './echo-host.ts';

const setup = async () => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const host = new EchoHost({ runtime });
  await host.open(Context.default());
  onTestFinished(async () => {
    await host.close();
    await dispose();
  });

  const spaceId = SpaceId.random();

  const countHeads = (documentId: DocumentId) =>
    RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const rows = yield* sql<{ n: number }>`
          SELECT COUNT(*) AS n FROM automerge_heads WHERE document_id = ${documentId}
        `;
        return Number(rows[0].n);
      }),
    );

  const countChunks = (documentId: DocumentId) =>
    RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const glob = `${documentId}-*`;
        const subduction = `subduction-*-${documentIdToSedimentreeIdHex(documentId)}*`;
        const rows = yield* sql<{ n: number }>`
          SELECT COUNT(*) AS n FROM automerge_chunks
          WHERE key = ${documentId} OR key GLOB ${glob} OR key GLOB ${subduction}
        `;
        return Number(rows[0].n);
      }),
    );

  const createRoot = async () => {
    const root = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: {},
      links: {},
    });
    await host.flush(Context.default());
    return root;
  };

  const linkObject = async (rootId: DocumentId, objectId: string) => {
    const doc = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: { [objectId]: { system: {}, meta: { keys: [] }, data: { title: objectId } } },
    });
    const rootHandle = await host.loadDoc<DatabaseDirectory>(Context.default(), rootId);
    rootHandle!.change((draft: DatabaseDirectory) => {
      draft.links ??= {};
      draft.links[objectId] = new A.RawString(doc.url);
    });
    await host.flush(Context.default());
    // The directory listing is debounced (50ms). Settling past it models the real sequence, where
    // an unlink replicates in well after the link it removes; without the wait the link and the
    // unlink coalesce into one listing update and the document is never observed as present.
    await sleep(120);
    return doc.documentId;
  };

  const unlink = async (rootId: DocumentId, objectId: string) => {
    const rootHandle = await host.loadDoc<DatabaseDirectory>(Context.default(), rootId);
    rootHandle!.change((draft: DatabaseDirectory) => {
      delete draft.links![objectId];
    });
    await host.flush(Context.default());
  };

  /** Links an existing document into an arbitrary parent, building a path deeper than the root. */
  const linkExisting = async (parentId: DocumentId, objectId: string, url: string) => {
    const parentHandle = await host.loadDoc<DatabaseDirectory>(Context.default(), parentId);
    parentHandle!.change((draft: DatabaseDirectory) => {
      draft.links ??= {};
      draft.links[objectId] = new A.RawString(url);
    });
    await host.flush(Context.default());
    await sleep(120);
  };

  return { host, spaceId, countChunks, countHeads, createRoot, linkObject, linkExisting, unlink };
};

describe('automatic reclamation', () => {
  // Skipped while `AUTOMATIC_GARBAGE_COLLECTION` is off in `echo-host.ts` — the current reachability
  // pass is too expensive to run on every directory update, so no wipe is scheduled.
  test.skip('wipes a document when its link leaves the space directory', async () => {
    const { host, spaceId, countChunks, createRoot, linkObject, unlink } = await setup();

    const root = await createRoot();
    await host.updateSpaceRoot(Context.default(), spaceId, root.url);
    const dropped = await linkObject(root.documentId, 'obj-dropped');
    const kept = await linkObject(root.documentId, 'obj-kept');
    expect(await countChunks(dropped)).toBeGreaterThan(0);

    // Stands in for a replicated unlink from a peer that ran garbage collection.
    await unlink(root.documentId, 'obj-dropped');

    await expect.poll(() => countChunks(dropped), { timeout: 5_000 }).to.equal(0);
    // Everything still linked is untouched.
    expect(await countChunks(kept)).toBeGreaterThan(0);
    expect(await countChunks(root.documentId)).toBeGreaterThan(0);
  });

  // Reachability is transitive, but the directory listing that produces candidates is only one hop
  // deep — so a document unlinked from the root while still linked from a sibling shows up as
  // departed and must survive on the strength of the deeper path. This is the direction that costs
  // data if the reachability search ever under-reports, which an early-exiting traversal could.
  test('keeps a departed document that is still reachable through another document', async () => {
    const { host, spaceId, countChunks, createRoot, linkObject, linkExisting, unlink } = await setup();

    const root = await createRoot();
    await host.updateSpaceRoot(Context.default(), spaceId, root.url);
    const holder = await linkObject(root.documentId, 'obj-holder');
    const shared = await linkObject(root.documentId, 'obj-shared');
    expect(await countChunks(shared)).toBeGreaterThan(0);

    // `shared` is now reachable both directly from the root and via `holder`.
    const sharedHandle = await host.loadDoc<DatabaseDirectory>(Context.default(), shared);
    await linkExisting(holder, 'obj-shared', sharedHandle!.url);

    // Dropping the direct link makes it a reclamation candidate; the path through `holder` remains.
    await unlink(root.documentId, 'obj-shared');

    // Let a reclamation pass run and settle, then assert it declined to wipe.
    await sleep(1_000);
    expect(await countChunks(shared)).toBeGreaterThan(0);
    expect(await countChunks(holder)).toBeGreaterThan(0);
  });

  // Skipped for the same reason as above: epoch retirement no longer schedules a reclaim pass.
  test.skip('wipes the retired root and its documents when a new epoch root is applied', async () => {
    const { host, spaceId, countChunks, createRoot, linkObject } = await setup();

    const oldRoot = await createRoot();
    await host.updateSpaceRoot(Context.default(), spaceId, oldRoot.url);
    const dropped = await linkObject(oldRoot.documentId, 'obj-dropped');

    const newRoot = await createRoot();
    await host.updateSpaceRoot(Context.default(), spaceId, newRoot.url);

    await expect.poll(() => countChunks(dropped), { timeout: 5_000 }).to.equal(0);
    await expect.poll(() => countChunks(oldRoot.documentId), { timeout: 5_000 }).to.equal(0);
    expect(await countChunks(newRoot.documentId)).toBeGreaterThan(0);
  });

  // A wipe interrupted partway is unrecoverable rather than merely incomplete: the orphan scan
  // enumerates the heads table, so chunks that outlive their heads row can never be found again.
  // The wipe therefore commits as one transaction, and a failure must leave the document whole.
  test('a failed wipe leaves the document intact', async () => {
    const { host, spaceId, countChunks, countHeads, createRoot, linkObject } = await setup();

    const root = await createRoot();
    await host.updateSpaceRoot(Context.default(), spaceId, root.url);
    const target = await linkObject(root.documentId, 'obj-target');
    const chunksBefore = await countChunks(target);
    expect(chunksBefore).toBeGreaterThan(0);
    expect(await countHeads(target)).toEqual(1);

    // Fails after the heads row is deleted but before the chunk ranges are — the window that
    // strands chunks if the two are not committed together.
    const { storage } = host.automergeHost;
    const removeRangeEffect = storage.removeRangeEffect.bind(storage);
    storage.removeRangeEffect = () =>
      Effect.fail(
        new SqlError.SqlError({
          reason: new SqlError.UnknownError({ cause: undefined, message: 'storage failure mid-wipe' }),
        }),
      );
    try {
      await expect(host.automergeHost.removeDocument(target)).rejects.toThrow();
    } finally {
      storage.removeRangeEffect = removeRangeEffect;
    }

    expect(await countHeads(target)).toEqual(1);
    expect(await countChunks(target)).toEqual(chunksBefore);
  });
});
