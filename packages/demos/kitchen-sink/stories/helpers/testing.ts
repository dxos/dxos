//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { Party } from '@dxos/client';
import { useClient, useSelection } from '@dxos/react-client';

import { EchoGraphModel, OrgBuilder, ProjectBuilder, TestType, usePartyBuilder } from '../../src';

/**
 * Create model.
 */
export const useGraphModel = (): EchoGraphModel => {
  const model = useMemo(() => new EchoGraphModel(), []);
  const party = useTestParty();
  const items = useSelection(party?.select()) ?? [];
  useEffect(() => {
    model.update(items);
  }, [items]);

  return model;
};

/**
 * Generate test party.
 */
export const useTestParty = (): Party | undefined => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const builder = usePartyBuilder(party);

  useEffect(() => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      setParty(party);
    });
  }, []);

  useEffect(() => {
    if (builder) {
      setImmediate(async () => {
        await builder.createOrgs([3, 7], async (orgBuilder: OrgBuilder) => {
          await orgBuilder.createPeople([3, 10]);
          await orgBuilder.createProjects([2, 7], async (projectBuilder: ProjectBuilder) => {
            const { result: people } = await orgBuilder.org
              .select()
              .children()
              .filter({ type: TestType.Person })
              .query();

            await projectBuilder.createTasks([2, 5], people);
          });
        });
      }, []);
    }
  }, [builder]);

  return party;
};
