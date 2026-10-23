//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { generateAutomergeUrl, interpretAsDocumentId } from '@automerge/automerge-repo';
import { describe, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { type DatabaseDirectory, SpaceDocVersion, createIdFromSpaceKey } from '@dxos/echo-protocol';
import { EntityId, PublicKey } from '@dxos/keys';

import { deriveCollectionIdFromSpaceId } from '../automerge/index.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost } from './echo-host.ts';
import { partitionBySyncScope } from './sync-scope.ts';

describe('sync scope', () => {
  test('partitions linked and branch documents by the objects in scope', ({ expect }) => {
    const [shared, sibling, other] = [EntityId.random(), EntityId.random(), EntityId.random()];
    const [sharedUrl, otherUrl, branchUrl, otherBranchUrl] = Array.from({ length: 4 }, () => generateAutomergeUrl());
    const directory: DatabaseDirectory = {
      version: SpaceDocVersion.CURRENT,
      objects: {},
      // `sibling` lives in the shared object's document, so that document stays in scope.
      links: { [shared]: sharedUrl, [sibling]: sharedUrl, [other]: otherUrl },
      branches: {
        [shared]: { draft: { members: { [shared]: branchUrl } } },
        [other]: { draft: { members: { [other]: otherBranchUrl } } },
      },
    };

    const { inScope, outOfScope } = partitionBySyncScope(directory, new Set([shared]));
    expect(inScope.sort()).toEqual([sharedUrl, branchUrl].map(interpretAsDocumentId).sort());
    expect(outOfScope.sort()).toEqual([otherUrl, otherBranchUrl].map(interpretAsDocumentId).sort());
  });

  test('a scoped space quarantines out-of-scope documents and releases them when the scope grows', async ({
    expect,
  }) => {
    const { runtime, dispose } = createTestSqliteRuntime();
    const host = new EchoHost({ runtime });
    await host.open(Context.default());
    onTestFinished(async () => {
      await host.close();
      await dispose();
    });

    const spaceKey = PublicKey.random();
    const spaceId = await createIdFromSpaceKey(spaceKey);
    const [shared, other] = [EntityId.random(), EntityId.random()];
    // Documents this host has never seen, as a guest's are before they replicate.
    const [sharedUrl, otherUrl] = [generateAutomergeUrl(), generateAutomergeUrl()];
    const otherId = interpretAsDocumentId(otherUrl);

    host.setSpaceSyncScope(spaceId, [shared]);
    const root = await host.createSpaceRoot(Context.default(), spaceKey);
    root.change((directory) => {
      directory.links ??= {};
      directory.links[shared] = new A.RawString(sharedUrl);
      directory.links[other] = new A.RawString(otherUrl);
    });

    await expect.poll(() => host.automergeHost.quarantinedDocuments.get(otherId)?.reason).toBe('out-of-scope');
    expect(host.automergeHost.isQuarantined(sharedUrl)).toBe(false);
    const collectionId = deriveCollectionIdFromSpaceId(spaceId, root.documentId);
    expect(Object.keys(host.automergeHost.getLocalCollectionState(collectionId)?.documents ?? {})).not.toContain(
      otherId,
    );

    host.setSpaceSyncScope(spaceId, [shared, other]);
    await expect.poll(() => host.automergeHost.isQuarantined(otherUrl)).toBe(false);
  });
});
