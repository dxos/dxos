//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';
import { HashRouter } from 'react-router-dom';

import { ClientProvider, useClient, useParties } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';
import { Button } from '@dxos/react-uikit';

import { SpaceList } from './SpaceList';

export default {
  title: 'react-appkit/SpaceList'
};

const Story = () => {
  const client = useClient();
  const spaces = useParties();

  return (
    <div>
      <Button onClick={() => client.echo.createParty()}>Add Space</Button>

      <SpaceList spaces={spaces} />
    </div>
  );
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <HashRouter>
          <Story />
        </HashRouter>
      </ProfileInitializer>
    </ClientProvider>
  );
};
