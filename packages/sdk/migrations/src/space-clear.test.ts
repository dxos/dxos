//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { clearSpaceEpochMigration } from './space-clear';

describe('space clear', () => {
  test('keeps only the named objects and drops the rest permanently', async () => {
    const testBuilder = new TestBuilder();
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    await client.halo.createIdentity();
    await client.addTypes([TestSchema.Expando]);

    try {
      const space = await client.spaces.create();
      await space.waitUntilReady();

      const survivor = space.db.add(Obj.make(TestSchema.Expando, { title: 'survivor' }));
      const cleared = space.db.add(Obj.make(TestSchema.Expando, { title: 'cleared' }));
      const alsoCleared = space.db.add(Obj.make(TestSchema.Expando, { title: 'also cleared' }));
      await space.db.flush();

      const epochsBefore = await space.internal.getEpochs();
      const { removed } = await clearSpaceEpochMigration(space, {
        keep: [space.properties.id, survivor.id],
      });

      expect(removed).toContain(cleared.id);
      expect(removed).toContain(alsoCleared.id);
      expect(removed).not.toContain(survivor.id);
      expect(removed).not.toContain(space.properties.id);

      const epochsAfter = await space.internal.getEpochs();
      expect(epochsAfter.length).toBe(epochsBefore.length + 1);

      const remaining = await space.db.query(Filter.type(TestSchema.Expando)).run();
      expect(remaining.map((object) => object.id)).toEqual([survivor.id]);

      // Dropped rather than tombstoned: no query mode reaches them after the epoch.
      const includingDeleted = await space.db
        .query(Query.select(Filter.everything()).options({ deleted: 'include' }))
        .run();
      expect(includingDeleted.map((object) => object.id)).not.toContain(cleared.id);
    } finally {
      await client.destroy();
    }
  });
});
