//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC, useState } from 'react';

import { PartyKey } from '@dxos/client';
import { useParty } from '@dxos/react-client';

import { useAppState } from '../../hooks';
import { ItemList } from './ItemList';
import { ItemTypeList } from './ItemTypeList';
import { PartyList } from './PartyList';

export const PartyView: FC<{
  partyKey?: PartyKey
}> = ({
  partyKey: controlledPartyKey
}) => {
  const [, { setPartyKey }] = useAppState(); // TODO(burdon): Move to container.
  const [type, setType] = useState<string>();
  const [partyKey] = useState(controlledPartyKey);
  const party = useParty(partyKey);
  if (!party) {
    return null;
  }

  // TODO(burdon): Change to being controlled due to Module update in root App.

  return (
    <Box flexDirection='column' flexGrow={1}>
      <Box flexGrow={1}>
        <PartyList
          partyKey={party.key}
          onSelect={partyKey => {
            setPartyKey(partyKey);
          }}
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
