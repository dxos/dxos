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

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { type DatabaseDirectory, EncodedReference, SpaceDocVersion } from '@dxos/echo-protocol';
import { EID, EntityId, SpaceId } from '@dxos/keys';

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
  test('finds the parent and the references in the data of the same space, at any depth', () => {
    const spaceId = SpaceId.random();
    const [parent, direct, nested, listed, qualified] = Array.from({ length: 5 }, () => EntityId.random());
    const ids = findReferencedObjectIds(
      {
        system: { parent: reference(parent) },
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
    expect(ids.sort()).toEqual([parent, direct, nested, listed, qualified].sort());
  });
});

describe('EchoHost.syncFirst', () => {
  test('names the object, then what it references, then the whole space', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    const host = new EchoHost({ runtime });
    await host.open(Context.default());
    onTestFinished(async () => {
      await host.close();
      await dispose();
    });

    const spaceId = SpaceId.random();
    const [shown, referenced, unrelated, unrelatedMissing] = Array.from({ length: 4 }, () => EntityId.random());
    using root = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: {},
      links: {},
    });
    const createObjectDoc = async (objectId: string, data: Record<string, unknown> = {}) => {
      using doc = await host.createDoc<DatabaseDirectory>({
        version: SpaceDocVersion.CURRENT,
        access: { spaceId },
        objects: { [objectId]: { system: {}, meta: { keys: [] }, data } },
      });
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
    await host.flush(Context.default());
    await host.updateSpaceRoot(Context.default(), spaceId, root.url);
    // Past the 50ms debounce of the directory listing.
    await sleep(120);

    const announced = () =>
      Object.keys(
        host['_automergeHost'].getLocalCollectionState(deriveCollectionIdFromSpaceId(spaceId, root.documentId))
          ?.documents ?? {},
      ).sort();
    const ids = (...urls: AutomergeUrl[]): DocumentId[] => urls.map((url) => interpretAsDocumentId(url)).sort();

    // The shown object is stored, so what it references is named with it; the reference is still to arrive.
    host.syncFirst(spaceId, shown);
    await expect.poll(announced).toEqual(ids(root.url, shownUrl, referencedUrl));

    // An object that references nothing stored elsewhere has nothing pending, so the whole space is named again.
    host.syncFirst(spaceId, unrelated);
    await expect.poll(announced).toEqual(ids(root.url, shownUrl, referencedUrl, unrelatedUrl, unrelatedMissingUrl));
  });
});
