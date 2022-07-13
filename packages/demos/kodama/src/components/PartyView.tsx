//
// Copyright 2022 DXOS.org
//

import { Box, useInput } from 'ink';
import React, { FC, useState } from 'react';

import { PartyKey } from '@dxos/client';
import { useParty } from '@dxos/react-client';

import { Feeds } from './Feeds';
import { ItemList } from './ItemList';
import { Menu } from './Menu';
import { Panel } from './Panel';
import { PartyInfo } from './PartyInfo';
import { ShareParty } from './ShareParty';
import { TypeList } from './TypeList';

export const PartyView: FC<{
  partyKey: PartyKey,
  onExit: () => void
}> = ({
  partyKey,
  onExit
}) => {
  const [tab, setTab] = useState('items');
  const [type, setType] = useState<string>();
  const party = useParty(partyKey);

  useInput((input, key) => {
    if (key.escape) {
      onExit();
    }
  });

  if (!party) {
    return null;
  }

  // TODO(burdon): Convert to Module.

  return (
    <Box flexDirection='column' flexGrow={1}>
      <Panel>
        <PartyInfo
          party={party}
        />
      </Panel>

      <Menu
        value={tab}
        onChange={setTab}
        items={[
          {
            id: 'items',
            label: 'Items'
          },
          {
            id: 'types',
            label: 'Types'
          },
          {
            id: 'feeds',
            label: 'Feeds'
          },
          {
            id: 'sharing',
            label: 'Sharing'
          }
        ]}
      />

      {tab === 'items' && (
        <Panel>
          <ItemList
            party={party}
            type={type}
          />
        </Panel>
      )}
      {tab === 'types' && (
        <Panel>
          <TypeList
            party={party}
            onChange={setType}
          />
        </Panel>
      )}
      {tab === 'feeds' && (
        <Panel>
          <Feeds
            partyKey={party.key}
          />
        </Panel>
      )}
      {tab === 'sharing' && (
        <Panel>
          <ShareParty
            party={party}
          />
        </Panel>
      )}
    </Box>
  );
};
