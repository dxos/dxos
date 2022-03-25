//
// Copyright 2022 DXOS.org
//
import faker from 'faker';
import { useEffect, useState } from 'react';

import { Party } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { OrgBuilder, PartyBuilder, ProjectBuilder, TestType, usePartyBuilder } from '../../src';

type TestPartyCallback = (builder: PartyBuilder) => Promise<void>;

/**
 * Generate test party.
 */

export const useTestParty = (callback: TestPartyCallback = buildTestParty): Party | undefined => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const builder = usePartyBuilder(party);

  useEffect(() => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      await party.setTitle(faker.lorem.word());
      setParty(party);
    });
  }, []);

  useEffect(() => {
    if (builder) {
      setImmediate(async () => {
        await callback(builder);
      }, []);
    }
  }, [builder, party]);

  return party;
};

/**
 * Build the party.
 * @param builder
 */
export const buildTestParty: TestPartyCallback = async (builder: PartyBuilder) => {
  await builder.createOrgs([3, 7], async (orgBuilder: OrgBuilder) => {
    await orgBuilder.createPeople([3, 10]);
    await orgBuilder.createProjects([2, 7], async (projectBuilder: ProjectBuilder) => {
      const result = await orgBuilder.org
        .select()
        .children()
        .filter({ type: TestType.Person })
        .query();

      await projectBuilder.createTasks([2, 5], result.entities);
    });
  });
};
