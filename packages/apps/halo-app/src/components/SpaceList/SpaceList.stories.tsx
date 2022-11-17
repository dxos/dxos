//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider, useClient, useSpaces } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';
import { Button } from '@dxos/react-uikit';

import { SpaceList } from './SpaceList';

export default {
  title: 'react-appkit/SpaceList'
};

const Story = () => {
  const client = useClient();
  const spaces = useSpaces();

  return (
    <div>
      <Button onClick={() => client.echo.createSpace()}>Add Space</Button>

      <SpaceList spaces={spaces} />
    </div>
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
