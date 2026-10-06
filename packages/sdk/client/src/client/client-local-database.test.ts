//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Config } from '@dxos/config';
import { Error as EchoError, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { SpaceId } from '@dxos/keys';

import { Client } from './client.ts';

describe('Client graph local databases', () => {
  test(
    'opens a local space through SpacesService and joins it to the graph',
    { timeout: 30_000 },
    async ({ expect }) => {
      const client = new Client({ config: new Config() });
      onTestFinished(() => client.destroy());
      await client.initialize();
      await client.halo.createIdentity();
      await client.addTypes([TestSchema.Person, TestSchema.Organization]);

      const space = await client.spaces.create();
      const local = await client.graph.localDatabase('settings');
      expect(SpaceId.isValid(local.spaceId)).toBe(true);
      expect(await client.graph.localDatabase('settings')).toBe(local);
      expect(client.graph.getDatabase(local.spaceId)).toBe(local);
      // Local spaces belong to the graph, not to the replicated space list.
      expect(client.spaces.get().map((candidate) => candidate.id)).not.toContain(local.spaceId);

      const org = space.db.add(Obj.make(TestSchema.Organization, { name: 'Acme' }));
      const person = local.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(org) }));
      await space.db.flush({ indexes: true });
      await local.flush({ indexes: true });
      expect(await person.employer?.load()).toBe(org);

      const everyone = await client.graph
        .query(
          Query.select(Filter.or(Filter.type(TestSchema.Person), Filter.type(TestSchema.Organization))).from(
            'all-accessible-spaces',
          ),
        )
        .run();
      expect(everyone.map((entity) => entity.name).sort()).toEqual(['Acme', 'Ada']);

      const localOrg = local.add(Obj.make(TestSchema.Organization, { name: 'Private' }));
      expect(() => space.db.add(Obj.make(TestSchema.Person, { name: 'Bob', employer: Ref.make(localOrg) }))).toThrow(
        EchoError.LocalReferenceError,
      );
    },
  );
});
