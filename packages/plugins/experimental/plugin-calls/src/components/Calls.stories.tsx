//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Config, PublicKey, useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Calls } from './Calls';

const roomId = PublicKey.fromHex(
  '04a1d1911703b8e929d0649021a965767483e9be254b488809946dfa1eb4a3b939a5d78a56495077b00f5c88e8cf8b8ec76ca9c77f19c138b5132c7b325c27e1a8',
);

const Story = () => {
  const client = useClient();
  const config = client.config;
  console.log('config', config);

  return (
    <div role='none' className='flex flex-grow flex-col row-span-2 is-full overflow-hidden'>
      <Calls roomId={roomId} iceServers={config.get('runtime.services.ice') ?? []} />
    </div>
  );
};

export default {
  title: 'plugins/plugin-calls/Calls',
  component: Calls,
  render: Story,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      config: new Config({
        runtime: {
          client: { edgeFeatures: { signaling: true } },
          services: {
            iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
            edge: { url: 'https://edge.dxos.workers.dev/' },
          },
        },
      }),
    }),
    withLayout({ fullscreen: true }),
    withTheme,
  ],
};

export const Default = {
  component: Calls,
};
