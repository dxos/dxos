//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Filter } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

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

      expect(result.compacted.length).to.be.greaterThan(0);
      expect(result.epochNumber).to.equal(epochsBefore.length);

      const objects = await space.db.query(Filter.type(TestSchema.Expando)).run();
      expect(objects).to.have.length(1);
      expect(objects[0].title).to.equal('before compaction');
      expect(objects[0].id).to.equal(object.id);

      const epochsAfter = await space.internal.getEpochs();
      expect(epochsAfter.length).to.equal(epochsBefore.length + 1);
    } finally {
      await client.destroy();
    }
  });
});
