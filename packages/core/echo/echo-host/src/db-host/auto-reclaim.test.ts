//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { type DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';

import { documentIdToSedimentreeIdHex } from '../automerge';
import { createTestSqliteRuntime } from '../testing';
import { EchoHost } from './echo-host';

const setup = async (options: { autoReclaim?: boolean } = {}) => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const host = new EchoHost({ runtime, ...options });
  await host.open(Context.default());
  onTestFinished(async () => {
    await host.close();
    await dispose();
  });

  const spaceId = SpaceId.random();

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
    await new Promise((resolve) => setTimeout(resolve, 120));
    return doc.documentId;
  };

  const unlink = async (rootId: DocumentId, objectId: string) => {
    const rootHandle = await host.loadDoc<DatabaseDirectory>(Context.default(), rootId);
    rootHandle!.change((draft: DatabaseDirectory) => {
      delete draft.links![objectId];
    });
    await host.flush(Context.default());
  };

  return { host, spaceId, countChunks, createRoot, linkObject, unlink };
};

describe('automatic reclamation', () => {
  test('wipes a document when its link leaves the space directory', async () => {
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

  test('wipes the retired root and its documents when a new epoch root is applied', async () => {
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

  test('leaves everything alone when disabled', async () => {
    const { host, spaceId, countChunks, createRoot, linkObject, unlink } = await setup({ autoReclaim: false });

    const root = await createRoot();
    await host.updateSpaceRoot(Context.default(), spaceId, root.url);
    const dropped = await linkObject(root.documentId, 'obj-dropped');
    await unlink(root.documentId, 'obj-dropped');

    // Nothing to wait for, so settle briefly and assert the bytes survived.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await countChunks(dropped)).toBeGreaterThan(0);
  });
});
