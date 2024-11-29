//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Config, useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Calls } from './Calls';
import CallsContainer from './CallsContainer';

const Story = () => {
  const client = useClient();
  const config = client.config;
  console.log('config', config);

  return (
    <div role='none' className='flex flex-grow flex-col row-span-2 is-full overflow-hidden'>
      <Calls username={'stories-user'} roomName={'test-room'} iceServers={config.get('runtime.services.ice') ?? []} />
    </div>
  );
};

export default {
  title: 'plugins/plugin-calls/CallsContainer',
  component: CallsContainer,
  render: Story,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      config: new Config({
        runtime: {
          services: {
            ice: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
            ],
          },
        },
      }),
    }),
    withLayout({ fullscreen: true }),
    withTheme,
  ],
};

export const Default = {
  component: CallsContainer,
};
