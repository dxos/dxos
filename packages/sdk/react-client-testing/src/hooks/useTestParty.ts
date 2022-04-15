//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { useEffect, useMemo, useState } from 'react';

import { Party } from '@dxos/client';
import { OrgBuilder, PartyBuilder, ProjectBuilder, TestType } from '@dxos/client-testing';
import { useClient } from '@dxos/react-client';

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
      // TODO(burdon): Use PartyBuidler.
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
// TODO(burdon): Rename (or remove -- too specific).
export const buildTestParty: TestPartyCallback = async (builder: PartyBuilder) => {
  await builder.createOrgs([3, 7], async (orgBuilder: OrgBuilder) => {
    await orgBuilder.createPeople([3, 10]);
    await orgBuilder.createProjects([2, 7], async (projectBuilder: ProjectBuilder) => {
      const result = await orgBuilder.org
        .select()
        .children()
        .filter({ type: TestType.Person })
        .exec();

      await projectBuilder.createTasks([2, 5], result.entities);
    });
  });
};

/**
 * @param party
 */
export const usePartyBuilder = (party?: Party) => {
  return useMemo(() => party ? new PartyBuilder(party) : undefined, [party?.key]);
};
