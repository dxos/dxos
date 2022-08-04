//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC, useState } from 'react';

import { PartyKey } from '@dxos/client';
import { useParty } from '@dxos/react-client';

import { ItemList } from './ItemList';
import { ItemTypeList } from './ItemTypeList';
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
    <Box flexDirection='column' flexGrow={1}>
      <Box flexGrow={1}>
        <PartyList
          partyKey={party.key}
        />
      </Box>
      <Box flexDirection='column' flexGrow={1}>
        <ItemList
          party={party}
          type={type}
        />
        <ItemTypeList
          party={party}
          onChange={setType}
        />
      </Box>
    </Box>
  );
};
