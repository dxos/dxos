//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import { useEffect, useMemo, useState } from 'react';

import {
  CheckBoxOutlineBlank as DefaultIcon,
  Business as OrgIcon,
  PersonOutline as PersonIcon,
  WorkOutline as ProjectIcon
} from '@mui/icons-material';
import { colors } from '@mui/material';

import { Party } from '@dxos/client';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { useClient, useSelection } from '@dxos/react-client';

import {
  EchoGraphModel,
  ItemAdapter,
  ItemMeta,
  OrgBuilder,
  ProjectBuilder,
  TestType,
  usePartyBuilder
} from '../../src';

export const typeMeta: { [i: string]: ItemMeta } = {
  [TestType.Org]: {
    icon: OrgIcon,
    label: 'Organization',
    plural: 'Organizations',
    color: colors.brown
  },
  [TestType.Person]: {
    icon: PersonIcon,
    label: 'Person',
    plural: 'People',
    color: colors.indigo
  },
  [TestType.Project]: {
    icon: ProjectIcon,
    label: 'Project',
    plural: 'Projects',
    color: colors.blue
  },
  [TestType.Task]: {
    icon: DefaultIcon,
    label: 'Task',
    plural: 'Tasks',
    color: colors.green
  }
};

export const tableStyles = css`
  ${Object.keys(typeMeta).map(
    type => `.${type.replace(/\W/g, '_')} { color: ${typeMeta[type].color[500]}; }`)}
`;

export const graphStyles = css`
  ${Object.keys(typeMeta).map(
    type => `g.${type.replace(/\W/g, '_')} { circle { fill: ${typeMeta[type].color[200]}; } }`)}
`;

/**
 * Get related data from items.
 */
export const itemAdapter: ItemAdapter = {
  title: (item: Item<ObjectModel>) => {
    return item.model.getProperty('title');
  },

  linkedTypes: (item: Item<ObjectModel>) => {
    const types = new Set<string>();
    item.children.forEach(item => item.type && types.add(item.type));
    return Array.from(types);
  },

  linkedItems: (item: Item<ObjectModel>, kind: string) => {
    return item.children.filter(item => item.type === kind);
  },

  meta: (type: string) => typeMeta[type]
};

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
