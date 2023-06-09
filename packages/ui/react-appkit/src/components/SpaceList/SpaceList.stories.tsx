//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import type { StoryFn } from '@storybook/react';
import React from 'react';
import { HashRouter } from 'react-router-dom';

import { Button } from '@dxos/aurora';
import { ClientProvider, useClient, useSpaces } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client/testing';

import { SpaceList } from './SpaceList';

export default {
  component: SpaceList,
};

export const Default = {
  render: () => {
    const client = useClient();
    const spaces = useSpaces();

    return (
      <div>
        <Button onClick={() => client.createSpace()}>Add Space</Button>

        <SpaceList spaces={spaces} />
      </div>
    );
  },
  decorators: [
    (Story: StoryFn) => {
      return (
        <ClientProvider>
          <ProfileInitializer>
            <HashRouter>
              <Story />
            </HashRouter>
          </ProfileInitializer>
        </ClientProvider>
      );
    },
  ],
};
