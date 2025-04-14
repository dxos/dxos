//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { CollectionType } from '@dxos/plugin-space/types';
import { Config, useClient } from '@dxos/react-client';
import { create, makeRef } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { CallContainer, type CallContainerProps } from './CallContainer';
import { MeetingPlugin } from '../MeetingPlugin';
import translations from '../translations';

const Render = (props: CallContainerProps) => {
  const client = useClient();
  const space = client.spaces.get().at(-1);

  if (!space) {
    return <div />;
  }

  return (
    <div className='flex grow gap-8 justify-center'>
      <div className='flex h-full border border-neutral-500'>
        <CallContainer {...props} />
      </div>
    </div>
  );
};

const meta: Meta<CallContainerProps> = {
  title: 'plugins/plugin-meeting/CallContainer',
  component: CallContainer,
  render: Render,
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            const space = await client.spaces.create();
            await space.waitUntilReady();
            space.properties[CollectionType.typename] = makeRef(create(CollectionType, { objects: [], views: {} }));
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
        SpacePlugin({ observability: false }),
        IntentPlugin(),
        MeetingPlugin(),
        SettingsPlugin(),
      ],
    }),
    withLayout({ fullscreen: true, tooltips: true }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<CallContainerProps>;

export const Default: Story = {
  args: {
    // Fixed room for testing.
    roomId: '04a1d1911703b8e929d0649021a965',
  },
};
