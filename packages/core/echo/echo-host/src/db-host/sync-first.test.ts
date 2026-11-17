//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocumentId,
  generateAutomergeUrl,
  interpretAsDocumentId,
} from '@automerge/automerge-repo';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type DatabaseDirectory, EncodedReference, SpaceDocVersion } from '@dxos/echo-protocol';
import { DXN, EID, EntityId, SpaceId } from '@dxos/keys';

import { deriveCollectionIdFromSpaceId } from '../automerge/index.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost } from './echo-host.ts';
import { findReferencedObjectIds, selectSyncFirstDocuments } from './sync-first.ts';

const reference = (entityId: EntityId, spaceId?: SpaceId) => EncodedReference.fromURI(EID.make({ spaceId, entityId }));

describe('selectSyncFirstDocuments', () => {
  test('keeps the documents the space opens with and those of the named objects, branches included', () => {
    const [rootUrl, credentialsUrl, firstUrl, otherUrl, branchUrl, otherBranchUrl] = Array.from({ length: 6 }, () =>
      generateAutomergeUrl(),
    );
    const directory: DatabaseDirectory = {
      version: SpaceDocVersion.CURRENT,
      access: { spaceId: SpaceId.random() },
      objects: {},
      links: { first: new A.RawString(firstUrl), other: new A.RawString(otherUrl) },
      branches: {
        first: { draft: { members: { first: branchUrl } } },
        other: { draft: { members: { other: otherBranchUrl } } },
      },
    };
    const documentIds = [rootUrl, credentialsUrl, firstUrl, otherUrl, branchUrl, otherBranchUrl].map((url) =>
      interpretAsDocumentId(url),
    );

    expect(selectSyncFirstDocuments(documentIds, directory, new Set(['first']))).toEqual(
      [rootUrl, credentialsUrl, firstUrl, branchUrl].map((url) => interpretAsDocumentId(url)),
    );
  });
});

describe('findReferencedObjectIds', () => {
  test('finds the schema, the parent and the references in the data of the same space, at any depth', () => {
    const spaceId = SpaceId.random();
    const [schema, parent, direct, nested, listed, qualified] = Array.from({ length: 6 }, () => EntityId.random());
    const ids = findReferencedObjectIds(
      {
        system: { type: reference(schema), parent: reference(parent) },
        meta: { keys: [] },
        data: {
          title: 'object',
          direct: reference(direct),
          nested: { deeper: { ref: reference(nested) } },
          list: [reference(listed), 'text'],
          qualified: reference(qualified, spaceId),
          elsewhere: reference(EntityId.random(), SpaceId.random()),
        },
      },
      spaceId,
    );
    expect(ids.sort()).toEqual([schema, parent, direct, nested, listed, qualified].sort());

    // A type from the registry rather than the space is not an object to replicate.
    const staticType = findReferencedObjectIds(
      {
        system: { type: EncodedReference.fromURI(DXN.make('org.dxos.type.document', '0.1.0')) },
        meta: { keys: [] },
        data: {},
      },
      spaceId,
    );
    expect(staticType).toEqual([]);
  });
});

describe('EchoHost.syncFirst', () => {
  const ids = (...urls: AutomergeUrl[]): DocumentId[] => urls.map((url) => interpretAsDocumentId(url)).sort();

  /** A space whose shown object references a document, and links another, that a peer has not delivered yet. */
  const setup = async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    const host = new EchoHost({ runtime });
    await host.open(Context.default());
    onTestFinished(async () => {
      await host.close();
      await dispose();
    });

    // Announcements are awaited as they are written, since the host schedules them on its own.
    const automergeHost = host['_automergeHost'];
    const written = new Event<{ collectionId: string; documentIds: DocumentId[] }>();
    const updateLocalCollectionState = automergeHost.updateLocalCollectionState.bind(automergeHost);
    automergeHost.updateLocalCollectionState = async (collectionId, documentIds) => {
      await updateLocalCollectionState(collectionId, documentIds);
      written.emit({ collectionId, documentIds: [...documentIds].sort() });
    };

    const spaceId = SpaceId.random();
    const [shown, referenced, unrelated, unrelatedMissing] = Array.from({ length: 4 }, () => EntityId.random());
    using root = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: {},
      links: {},
    });
    const collectionId = deriveCollectionIdFromSpaceId(spaceId, root.documentId);
    const announced = (expected: DocumentId[]) =>
      written.waitFor(
        (update) => update.collectionId === collectionId && update.documentIds.join() === expected.join(),
      );
    const createObjectDoc = async (objectId: string, data: Record<string, unknown> = {}, documentId?: DocumentId) => {
      const value = {
        version: SpaceDocVersion.CURRENT,
        access: { spaceId },
        objects: { [objectId]: { system: {}, meta: { keys: [] }, data } },
      };
      // A given id stands for a document a peer delivers, which only an import can carry.
      using doc = documentId
        ? await host.createDoc(A.from(value), { preserveHistory: true, documentId })
        : await host.createDoc(value);
      return doc.url;
    };

    const shownUrl = await createObjectDoc(shown, { link: reference(referenced) });
    const unrelatedUrl = await createObjectDoc(unrelated);
    // Linked, but never stored here: documents still to arrive from a peer.
    const referencedUrl = generateAutomergeUrl();
    const unrelatedMissingUrl = generateAutomergeUrl();
    root.change((draft: DatabaseDirectory) => {
      draft.links = {
        [shown]: new A.RawString(shownUrl),
        [referenced]: new A.RawString(referencedUrl),
        [unrelated]: new A.RawString(unrelatedUrl),
        [unrelatedMissing]: new A.RawString(unrelatedMissingUrl),
      };
    });
    const everything = ids(root.url, shownUrl, referencedUrl, unrelatedUrl, unrelatedMissingUrl);
    const listed = announced(everything);
    await host.flush(Context.default());
    await host.updateSpaceRoot(Context.default(), spaceId, root.url);
    await listed;

    return {
      host,
      spaceId,
      shown,
      referenced,
      unrelated,
      announced,
      createObjectDoc,
      everything,
      shownFirst: ids(root.url, shownUrl, referencedUrl),
      referencedDocumentId: interpretAsDocumentId(referencedUrl),
    };
  };

  test('names the object and what it references, then the whole space once the reference arrives', async () => {
    const {
      host,
      spaceId,
      shown,
      referenced,
      announced,
      createObjectDoc,
      everything,
      shownFirst,
      referencedDocumentId,
    } = await setup();

    const first = announced(shownFirst);
    host.syncFirst(spaceId, shown);
    await first;

    const rest = announced(everything);
    await createObjectDoc(referenced, {}, referencedDocumentId);
    await host.flush(Context.default());
    await rest;
  });

  test('a request for another object replaces the pending one', async () => {
    const { host, spaceId, shown, unrelated, announced, everything, shownFirst } = await setup();

    const first = announced(shownFirst);
    host.syncFirst(spaceId, shown);
    await first;

    // An object that references nothing stored elsewhere has nothing pending, so the whole space is named again.
    const rest = announced(everything);
    host.syncFirst(spaceId, unrelated);
    await rest;
  });
});
