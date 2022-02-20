//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { Party } from '@dxos/client';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { useClient, useSelection } from '@dxos/react-client';

import { itemAdapter } from './testing';

import { EchoGraphModel, OrgBuilder, PartyBuilder, ProjectBuilder, TestType, usePartyBuilder } from '../../src';

// TODO(burdon): Accidentally test types are naturally alphabetical.
export const sortItems = (a: Item<ObjectModel>, b: Item<ObjectModel>) => {
  if (a.type! < b.type!) {
    return -1;
  }
  if (a.type! > b.type!) {
    return 1;
  }

  const ta = itemAdapter.title(a).toLowerCase();
  const tb = itemAdapter.title(b).toLowerCase();

  return (ta < tb) ? -1 : (ta > tb) ? 1 : 0;
}

/**
 * Filter items.
 */
export const useQuery = (party?: Party, query?: string): Item<ObjectModel>[] => {
  const text = query?.toLowerCase();
  const items = useSelection(party?.select()
    .filter(item => {
      if (!item.type?.startsWith('example:')) {
        return false;
      }

      if (!text) {
        return true;
      }

      const title = itemAdapter.title(item)?.toLowerCase();
      return title?.indexOf(text) !== -1;
    }),
    [text]
  ) ?? [];

  items.sort(sortItems);
  return items;
}

/**
 * Create model.
 */
export const useGraphModel = (party?: Party): EchoGraphModel => {
  const model = useMemo(() => new EchoGraphModel(), []);
  const items = useSelection(party?.select()) ?? [];
  useEffect(() => {
    let filteredItems = items
      .filter(item => item.type?.startsWith('example:'));

    model.update(filteredItems);
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
        await buildTestParty(party!, builder);
      }, []);
    }
  }, [builder, party]);

  return party;
};

export const buildTestParty = async (party: Party, builder: PartyBuilder) => {
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
};
