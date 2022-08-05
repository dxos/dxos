//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { useState } from 'react';

import { useParty } from '@dxos/react-client';

import { useAppState } from '../../hooks';
import { ItemList } from './ItemList';
import { ItemTypeList } from './ItemTypeList';
import { PartyList } from './PartyList';

export const PartyView = () => {
  const [{ partyKey }, { setPartyKey }] = useAppState();
  const [type, setType] = useState<string>();
  const party = useParty(partyKey);
  if (!party) {
    return null;
  }

  // TODO(burdon): List item isn't selected.
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
