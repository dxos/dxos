//
// Copyright 2022 DXOS.org
//

import { Box, useInput } from 'ink';
import React, { FC, useMemo, useState } from 'react';

import { PartyKey } from '@dxos/client';
import { useParty } from '@dxos/react-client';

import { ShareParty } from '../sharing';
import { Module, ModulePanel, Panel } from '../util';
import { ItemList } from './ItemList';
import { ItemTypeList } from './ItemTypeList';
import { PartyFeeds } from './PartyFeeds';
import { PartyInfo } from './PartyInfo';
import { PartyMembers } from './PartyMembers';

export const PartyView: FC<{
  partyKey: PartyKey
  onExit: () => void
}> = ({
  partyKey,
  onExit
}) => {
  const [type, setType] = useState<string>();
  const party = useParty(partyKey);

  useInput((input, key) => {
    if (key.escape) {
      onExit();
    }
  });

  // TODO(burdon): Convert to Module.
  const modules: Module[] = useMemo(() => party ? [
    {
      id: 'items',
      label: 'Items',
      component: () => (
        <ItemList
          party={party}
          type={type}
        />
      )
    },
    {
      id: 'types',
      label: 'Types',
      component: () => (
        <ItemTypeList
          party={party}
          onChange={setType}
        />
      )
    },
    {
      id: 'members',
      label: 'Members',
      component: () => (
        <Panel>
          <PartyMembers
            party={party}
          />
        </Panel>
      )
    },
    {
      id: 'feeds',
      label: 'Feeds',
      component: () => (
        <PartyFeeds
          party={party}
        />
      )
    },
    {
      id: 'sharing',
      label: 'Sharing',
      component: () => (
        <Panel>
          <ShareParty
            party={party}
          />
        </Panel>
      )
    }
  ] : [], [party, type]);

  if (!party) {
    return null;
  }

  return (
    <Box flexDirection='column' flexGrow={1}>
      <Panel>
        <PartyInfo
          party={party}
        />
      </Panel>

      <ModulePanel
        modules={modules}
      />
    </Box>
  );
};
