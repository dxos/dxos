//
// Copyright 2022 DXOS.org
//

import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import React, { FC, ReactNode, useEffect, useState } from 'react';

import { PartyKey } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient, useProfile } from '@dxos/react-client';

import { Config, JoinParty, PartyList, Profile } from './components';

const Panel: FC<{ children: ReactNode }> = ({ children }) => (
  <Box flexDirection='column'>
    <Profile />

    {children}

    <Box padding={1}>
      <Text color='gray'>[Esc] to return.</Text>
    </Box>
  </Box>
);

/**
 * Top-level app with menu.
 */
export const App = () => {
  const client = useClient();
  const profile = useProfile();
  const [mode, setMode] = useState<string>();
  const [partyKey, setPartyKey] = useState<PartyKey>();
  const { exit } = useApp();

  // TODO(burdon): Create temp profile unless one is set already.
  useAsyncEffect(async () => {
    if (!profile) {
      await client.halo.createProfile();
    }
  }, []);

  useEffect(() => {
    if (mode === 'exit') {
      exit();
    }
  }, [mode]);

  useInput((input, key) => {
    if (key.escape) {
      setMode(undefined);
    }
  });

  if (!profile) {
    return null;
  }

  switch (mode) {
    case 'parties': {
      return (
        <Panel>
          <PartyList
            partyKey={partyKey}
          />
        </Panel>
      );
    }

    case 'join': {
      return (
        <Panel>
          <JoinParty
            onJoin={(partyKey?: PartyKey) => {
              setPartyKey(partyKey);
              setMode(partyKey ? 'parties' : undefined);
            }}
          />
        </Panel>
      );
    }

    case 'config': {
      return (
        <Panel>
          <Config />
        </Panel>
      );
    }

    case 'exit': {
      return null;
    }

    default: {
      return (
        <Box flexDirection='column'>
          <Profile />

          <Box marginTop={1}>
            <SelectInput
              onSelect={item => setMode(item.value)}
              items={[
                {
                  value: 'parties', label: 'View parties'
                },
                {
                  value: 'join', label: 'Join party'
                },
                {
                  value: 'config', label: 'Config'
                },
                {
                  value: 'exit', label: 'Exit'
                }
              ]}
            />
          </Box>
        </Box>
      );
    }
  }
};
