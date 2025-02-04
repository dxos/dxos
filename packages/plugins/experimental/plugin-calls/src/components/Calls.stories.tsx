//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { Config, PublicKey, useConfig } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Calls, type CallsProps } from './Calls';

const Story = (props: CallsProps) => {
  const config = useConfig();
  return <Calls {...props} iceServers={config.get('runtime.services.ice') ?? []} />;
};

const meta: Meta<typeof Calls> = {
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
            edge: { url: 'https://edge.dxos.workers.dev/' },
            iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
          },
        },
      }),
    }),
    withLayout({ fullscreen: true }),
    withTheme,
  ],
};

export default meta;

type Story = StoryObj<typeof Calls>;

export const Default: Story = {
  args: {
    username: 'stories-user',
    roomId: PublicKey.fromHex(
      '04a1d1911703b8e929d0649021a965767483e9be254b488809946dfa1eb4a3b939a5d78a56495077b00f5c88e8cf8b8ec76ca9c77f19c138b5132c7b325c27e1a8',
    ),
  },
};
