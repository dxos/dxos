//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager } from 'ink';
import React, { useState } from 'react';

import { useSpace } from '@dxos/react-client';

import { useAppState } from '../../hooks';
import { ItemList } from './ItemList';
import { ItemTypeList } from './ItemTypeList';
import { PartyList } from './PartyList';

export const PartyView = () => {
  const { focus } = useFocus({ isActive: false });
  const { focusNext } = useFocusManager();
  const [{ partyKey }, { setPartyKey }] = useAppState();
  const [type, setType] = useState<string>();
  const party = useSpace(partyKey);

  return (
    <Box flexDirection='column' flexGrow={1}>
      <Box flexDirection='column' flexGrow={1}>
        <PartyList
          partyKey={party?.key}
          onSelect={(partyKey) => {
            setPartyKey(partyKey);
            focusNext();
          }}
        />
      </Box>

      {party && (
        <Box flexDirection='column' flexGrow={1}>
          <ItemList
            party={party}
            type={type}
            onCancel={() => {
              focus('party-list');
            }}
          />

          <ItemTypeList party={party} onChange={setType} />

          <Box padding={1}>
            <Text>ENTER to select ECHO Space; TAB/arrow keys to navigate; SHIFT-TAB to return.</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
