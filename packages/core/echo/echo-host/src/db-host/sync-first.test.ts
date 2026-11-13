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
import { type DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import { SpaceId } from '@dxos/keys';

import { deriveCollectionIdFromSpaceId } from '../automerge/index.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost } from './echo-host.ts';
import { selectSyncFirstDocuments } from './sync-first.ts';

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

describe('EchoHost.syncFirst', () => {
  test('names only the sync-first documents in the space collection until they have all arrived', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    const host = new EchoHost({ runtime });
    await host.open(Context.default());
    onTestFinished(async () => {
      await host.close();
      await dispose();
    });

    const spaceId = SpaceId.random();
    using root = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: {},
      links: {},
    });
    const createObjectDoc = async (objectId: string) => {
      using doc = await host.createDoc<DatabaseDirectory>({
        version: SpaceDocVersion.CURRENT,
        access: { spaceId },
        objects: { [objectId]: { system: {}, meta: { keys: [] }, data: {} } },
      });
      return doc.url;
    };
    const presentUrl = await createObjectDoc('present');
    // Linked, but never stored here: a document still to arrive from a peer.
    const missingUrl = generateAutomergeUrl();
    root.change((draft: DatabaseDirectory) => {
      draft.links = { present: new A.RawString(presentUrl), missing: new A.RawString(missingUrl) };
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

    host.syncFirst(spaceId, ['missing']);
    await expect.poll(announced).toEqual(ids(root.url, missingUrl));

    // Every named document is stored, so the whole space is named again.
    host.syncFirst(spaceId, ['present']);
    await expect.poll(announced).toEqual(ids(root.url, presentUrl, missingUrl));
  });
});
