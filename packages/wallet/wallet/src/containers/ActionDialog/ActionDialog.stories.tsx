//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import { HashRouter } from 'react-router-dom';

import { Box, Button } from '@mui/material';

import { PublicKey } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';
import { Toolbar } from '@dxos/react-components';

import { ActionType, useActions } from '../../hooks';
import { ActionProvider } from '../ActionProvider';
import { ActionDialog } from './ActionDialog';

export default {
  title: 'react-appkit/ActionDialog'
};

const Story = () => {
  const [, dispatch] = useActions();
  const client = useClient();
  const [partyKey, setPartyKey] = useState<PublicKey>();

  useAsyncEffect(async () => {
    const party = await client.echo.createParty();
    setPartyKey(party.key);
  }, []);

  if (!partyKey) {
    return null;
  }

  return (
    <Box>
      <Toolbar>
        <Button
          onClick={() => dispatch({ type: ActionType.RESET })}
        >
          RESET
        </Button>
        <Button
          onClick={() => dispatch({ type: ActionType.HALO_SHARING })}
        >
          HALO_SHARING
        </Button>
        <Button
          onClick={() => dispatch({ type: ActionType.PARTY_SHARING, params: { partyKey } })}
        >
          PARTY_SHARING
        </Button>
        <Button
          onClick={() => dispatch({ type: ActionType.PARTY_JOIN })}
        >
          PARTY_JOIN
        </Button>
        <Button
          onClick={() => dispatch({ type: ActionType.NOTIFICATION, params: { message: 'Notification' } })}
        >
          NOTIFICATION
        </Button>
        <Button
          onClick={() => dispatch({ type: ActionType.DANGEROUSLY_RESET_STORAGE })}
        >
          DANGEROUSLY_RESET_STORAGE
        </Button>
      </Toolbar>

      <ActionDialog />
    </Box>
  );
};

export const Primary = () => {
  return (
    <HashRouter>
      <ClientProvider>
        <ProfileInitializer>
          <ActionProvider>
            <Story />
          </ActionProvider>
        </ProfileInitializer>
      </ClientProvider>
    </HashRouter>
  );
};
