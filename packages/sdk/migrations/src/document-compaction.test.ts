//
// Copyright 2026 DXOS.org
//

import { type AnyDocumentId } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

import { compactDocumentsEpochMigration } from './document-compaction';

describe('document compaction', () => {
  test('compacts linked documents and creates a new epoch', async () => {
    const testBuilder = new TestBuilder();
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    await client.halo.createIdentity();
    await client.addTypes([TestSchema.Expando]);

    try {
      const space = await client.spaces.create();
      await space.waitUntilReady();

      const object = space.db.add(Obj.make(TestSchema.Expando, { title: 'before compaction' }));
      await space.db.flush();

      const epochsBefore = await space.internal.getEpochs();
      const result = await compactDocumentsEpochMigration(space);

      expect(result.compacted.length).toBeGreaterThan(0);
      expect(result.epochNumber).toBe(epochsBefore.length);

      const objects = await space.db.query(Filter.type(TestSchema.Expando)).run();
      expect(objects).toHaveLength(1);
      expect(objects[0]?.title).toBe('before compaction');
      expect(objects[0]?.id).toBe(object.id);

      const epochsAfter = await space.internal.getEpochs();
      expect(epochsAfter.length).toBe(epochsBefore.length + 1);

      // The re-created root and linked documents carry the space identifiers.
      // Epoch credentials and root links store automerge URLs as plain strings, so the
      // branded AnyDocumentId casts below are the only way to hand them back to the repo.
      const repo = space.internal.db._repo;
      const rootUrl = String(epochsAfter[epochsAfter.length - 1]?.subject.assertion.automergeRoot);
      const rootHandle = repo.find<DatabaseDirectory>(rootUrl as AnyDocumentId);
      await rootHandle.whenReady();
      expect(rootHandle.doc()?.access?.spaceId).toBe(space.id);
      const linkUrl = rootHandle.doc()?.links?.[object.id]?.toString();
      invariant(linkUrl, 'Compacted object link missing from new root');
      const linkedHandle = repo.find<DatabaseDirectory>(linkUrl as AnyDocumentId);
      await linkedHandle.whenReady();
      expect(linkedHandle.doc()?.access?.spaceId).toBe(space.id);
      expect(linkedHandle.doc()?.access?.spaceKey).toBe(space.key.toHex());
    } finally {
      await client.destroy();
    }
  });
});
