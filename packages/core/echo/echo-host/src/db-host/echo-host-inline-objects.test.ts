//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import {
  type DocumentId,
  generateAutomergeUrl,
  isValidAutomergeUrl,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { type DatabaseDirectory, EncodedReference, type EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, SpaceId, URI } from '@dxos/keys';

import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost } from './echo-host.ts';
import { inlineObjectDocumentId, isUntouchedSinceCreation } from './inline-objects.ts';

const TASK_TYPE = EncodedReference.fromURI(URI.make('dxn:com.example.type.task:0.1.0'));

const openHost = async () => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const host = new EchoHost({ runtime });
  await host.open(Context.default());
  onTestFinished(async () => {
    await host.close();
    await dispose();
  });
  return host;
};

/** A space directory as clients that predate linked-only directories wrote it: objects inlined in the root. */
const legacyDirectory = (spaceId: SpaceId, objects: Record<string, EntityStructure>): A.Doc<DatabaseDirectory> =>
  A.change(A.init<DatabaseDirectory>(), (draft) =>
    Object.assign(draft, { version: SpaceDocVersion.CURRENT, access: { spaceId }, objects, links: {} }),
  );

const task = (title: string, previous?: string): EntityStructure => ({
  system: {
    type: TASK_TYPE,
    createdAt: 1_700_000_000_000,
  },
  meta: { keys: [{ source: 'example.com', id: title }] },
  data: { title, ...(previous ? { previous: EncodedReference.fromURI(EID.make({ entityId: previous })) } : {}) },
});

/** Opens a space on `host` whose directory is `directory`, stored under `documentId`. */
const openSpace = async (
  host: EchoHost,
  spaceId: SpaceId,
  documentId: DocumentId,
  directory: A.Doc<DatabaseDirectory>,
) => {
  using root = await host.createDoc<DatabaseDirectory>(A.clone(directory), { preserveHistory: true, documentId });
  await host.flush(Context.default());
  await host.updateSpaceRoot(Context.default(), spaceId, root.url);
  await host.migrateInlineObjects(spaceId);
};

const readDirectory = async (host: EchoHost, documentId: DocumentId): Promise<DatabaseDirectory> => {
  using lease = await host.loadDoc<DatabaseDirectory>(Context.default(), documentId);
  invariant(lease, `Document is not loadable: ${documentId}`);
  return A.toJS(lease.doc());
};

const readHeads = async (host: EchoHost, documentId: DocumentId): Promise<A.Heads> => {
  using lease = await host.loadDoc<DatabaseDirectory>(Context.default(), documentId);
  invariant(lease, `Document is not loadable: ${documentId}`);
  return A.getHeads(lease.doc());
};

const randomDocumentId = (): DocumentId => parseAutomergeUrl(generateAutomergeUrl()).documentId;

describe('inline object migration', () => {
  test('moves every inline object into a linked document of its own, keeping its id and state', async () => {
    const host = await openHost();
    const spaceId = SpaceId.random();
    const rootId = randomDocumentId();
    const [first, second] = [EntityId.random(), EntityId.random()];
    const objects = { [first]: task('first'), [second]: task('second', first) };

    await openSpace(host, spaceId, rootId, legacyDirectory(spaceId, objects));

    const root = await readDirectory(host, rootId);
    expect(root.objects).toEqual({});
    expect(Object.keys(root.links ?? {}).sort()).toEqual([first, second].sort());
    for (const [objectId, structure] of Object.entries(objects)) {
      const documentId = await inlineObjectDocumentId(rootId, objectId);
      expect(String(root.links?.[objectId])).toBe(`automerge:${documentId}`);
      const linked = await readDirectory(host, documentId);
      expect(linked.access?.spaceId).toBe(spaceId);
      expect(Object.keys(linked.objects ?? {})).toEqual([objectId]);
      expect(linked.objects?.[objectId]).toEqual(structure);
    }
  });

  test('is idempotent: a migrated directory is left as it is', async () => {
    const host = await openHost();
    const spaceId = SpaceId.random();
    const rootId = randomDocumentId();
    const objectId = EntityId.random();
    await openSpace(host, spaceId, rootId, legacyDirectory(spaceId, { [objectId]: task('only') }));

    const heads = await readHeads(host, rootId);
    const linkedHeads = await readHeads(host, await inlineObjectDocumentId(rootId, objectId));
    await host.migrateInlineObjects(spaceId);
    await host.migrateInlineObjects(spaceId);

    expect(await readHeads(host, rootId)).toEqual(heads);
    expect(await readHeads(host, await inlineObjectDocumentId(rootId, objectId))).toEqual(linkedHeads);
  });

  test('two peers migrating the same directory converge on one document per object', async () => {
    const [host1, host2] = [await openHost(), await openHost()];
    const spaceId = SpaceId.random();
    const rootId = randomDocumentId();
    const [first, second] = [EntityId.random(), EntityId.random()];
    const directory = legacyDirectory(spaceId, { [first]: task('first'), [second]: task('second', first) });

    // Neither peer sees the other's migration: both run it on the same directory, independently.
    await openSpace(host1, spaceId, rootId, directory);
    await openSpace(host2, spaceId, rootId, directory);

    for (const objectId of [first, second]) {
      const documentId = await inlineObjectDocumentId(rootId, objectId);
      // Byte-identical changes, so replicating them merges into one document rather than conflicting.
      expect(await readHeads(host1, documentId)).toEqual(await readHeads(host2, documentId));
    }

    // Merging the two migrated directories, as replication would.
    using lease1 = await host1.loadDoc<DatabaseDirectory>(Context.default(), rootId);
    using lease2 = await host2.loadDoc<DatabaseDirectory>(Context.default(), rootId);
    invariant(lease1 && lease2);
    const merged = A.toJS(A.merge(A.clone(lease1.doc()), lease2.doc()));
    expect(merged.objects).toEqual({});
    expect(merged.links).toEqual(A.toJS(lease1.doc()).links);
    expect(Object.keys(merged.links ?? {}).sort()).toEqual([first, second].sort());
  });

  test('adds objects as linked documents only', async () => {
    const host = await openHost();
    const spaceId = SpaceId.random();
    const rootId = randomDocumentId();
    await openSpace(host, spaceId, rootId, legacyDirectory(spaceId, {}));

    const objectId = EntityId.random();
    await host.addObjects(Context.default(), spaceId, { [objectId]: task('imported') });

    const root = await readDirectory(host, rootId);
    expect(root.objects).toEqual({});
    const link = String(root.links?.[objectId]);
    invariant(isValidAutomergeUrl(link), 'Object is not linked.');
    const linked = await readDirectory(host, parseAutomergeUrl(link).documentId);
    expect(linked.objects?.[objectId]).toEqual(task('imported'));
  });

  test('a document counts as untouched until something edits it after creation', () => {
    const created = A.change(A.init<DatabaseDirectory>(), (draft) => Object.assign(draft, { objects: {} }));
    expect(isUntouchedSinceCreation(created)).toBe(true);
    const edited = A.change(A.clone(created), (draft) => {
      draft.version = SpaceDocVersion.CURRENT;
    });
    expect(isUntouchedSinceCreation(edited)).toBe(false);
  });
});
