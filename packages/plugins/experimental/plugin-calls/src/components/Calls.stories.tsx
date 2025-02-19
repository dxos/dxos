//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { log } from '@dxos/log';
import { ClientPlugin } from '@dxos/plugin-client';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { SpacePlugin } from '@dxos/plugin-space';
import { CollectionType } from '@dxos/plugin-space/types';
import { Config, PublicKey } from '@dxos/react-client';
import { create, makeRef, useSpaces, SpaceState } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Calls, type CallsProps } from './Calls';

const Render = (props: CallsProps) => {
  const space = useSpaces({ all: true }).at(-1);

  if (!space || space.state.get() !== SpaceState.SPACE_READY) {
    return <div />;
  }

  return (
    <div className='flex h-full overflow-hidden w-96 outline outline-red-500'>
      <Calls {...props} space={space} />
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
            const space = await client.spaces.create();
            await space.waitUntilReady();
            space.properties[CollectionType.typename] = makeRef(create(CollectionType, { objects: [], views: {} }));
            log.info('>>> onClientInitialized ', { space, folder: space.properties[CollectionType.typename].target });
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
        MarkdownPlugin(),
      ],
    }),
    withLayout({ fullscreen: true, tooltips: true, classNames: 'justify-center' }),
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
  },
};
