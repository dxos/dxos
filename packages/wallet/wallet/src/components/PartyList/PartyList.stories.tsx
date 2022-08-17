//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Box, Button } from '@mui/material';

import { ClientProvider, useClient, useParties } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';
import { Toolbar } from '@dxos/react-components';

import { PartyList } from './PartyList';

export default {
  title: 'react-appkit/PartyList'
};

const Story = () => {
  const client = useClient();
  const parties = useParties();

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => client.echo.createParty()}>Add Party</Button>
      </Toolbar>

      <PartyList parties={parties} />
    </Box>
  );
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <Story />
      </ProfileInitializer>
    </ClientProvider>
  );
};
