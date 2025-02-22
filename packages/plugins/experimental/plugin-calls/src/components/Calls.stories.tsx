//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client';
import { Config, PublicKey } from '@dxos/react-client';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { ScrollContainer } from '@dxos/react-ui-components';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Calls, type CallsProps } from './Calls';
import { TranscriptionList } from './Transcription';
import { type TranscriptionBlock } from '../types';
import { randomQueueDxn } from '../utils';

const Render = (props: CallsProps) => {
  const client = useEdgeClient();
  const queue = useQueue<TranscriptionBlock>(client, DXN.parse(props.storybookQueueDxn!), { pollInterval: 500 });

  return (
    <div className='flex grow gap-8 justify-center'>
      <div className='flex h-full w-96'>
        <Calls {...props} />
      </div>
      <div className='flex h-full w-96'>
        <ScrollContainer>
          <TranscriptionList blocks={queue?.items} />
        </ScrollContainer>
      </div>
    </div>
  );
};

const meta: Meta<typeof Calls> = {
  title: 'plugins/plugin-calls/Calls',
  component: Calls,
  render: Render,
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
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
      ],
    }),
    withLayout({ fullscreen: true, tooltips: true }),
    withTheme,
  ],
};

export default meta;

type Story = StoryObj<typeof Calls>;

export const Default: Story = {
  args: {
    roomId: PublicKey.fromHex(
      '04a1d1911703b8e929d0649021a965767483e9be254b488809946dfa1eb4a3b939a5d78a56495077b00f5c88e8cf8b8ec76ca9c77f19c138b5132c7b325c27e1a8',
    ),
    storybookQueueDxn: randomQueueDxn().toString(),
  },
};
