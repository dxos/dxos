//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC, useState } from 'react';

import { PartyKey } from '@dxos/client';
import { useParty } from '@dxos/react-client';

import { Panel } from '../util';
import { ItemList } from './ItemList';
import { ItemTypeList } from './ItemTypeList';
import { PartyInfo } from './PartyInfo';
import { PartyList } from './PartyList';

export const PartyView: FC<{
  partyKey?: PartyKey
}> = ({
  partyKey
}) => {
  const [type, setType] = useState<string>();
  const party = useParty(partyKey);
  if (!party) {
    return null;
  }

  return (
    <Box flexDirection='row' flexGrow={1}>
      <Box flexGrow={1}>
        <PartyList
          partyKey={party.key}
        />
      </Box>
      <Box flexGrow={1} flexDirection='column'>
        <Panel>
          <PartyInfo
            party={party}
          />
        </Panel>
        <ItemTypeList
          party={party}
          onChange={setType}
        />
        <ItemList
          party={party}
          type={type}
        />
      </Box>
    </Box>
  );
};
