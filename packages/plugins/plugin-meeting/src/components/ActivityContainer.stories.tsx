//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { CollectionType } from '@dxos/plugin-space/types';
import { Transcript, TranscriptionPlugin } from '@dxos/plugin-transcription';
import { TranscriptType, type TranscriptBlock } from '@dxos/plugin-transcription/types';
import { Config, useClient } from '@dxos/react-client';
import { create, Filter, makeRef, useQuery, useQueue } from '@dxos/react-client/echo';
import { ScrollContainer } from '@dxos/react-ui-components';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ActivityContainer, type ActivityContainerProps } from './ActivityContainer';
import { MeetingPlugin } from '../MeetingPlugin';
import translations from '../translations';

const Render = (props: ActivityContainerProps) => {
  const client = useClient();
  const space = client.spaces.get().at(-1);
  const transcripts = useQuery(space, Filter.schema(TranscriptType));
  const dxn = transcripts[0]?.queue;
  const queue = useQueue<TranscriptBlock>(dxn ? DXN.parse(dxn) : undefined, { pollInterval: 500 });

  if (!space) {
    return <div />;
  }

  return (
    <div className='flex grow gap-8 justify-center'>
      <div className='flex h-full border border-neutral-500'>
        <ActivityContainer {...props} />
      </div>
      <div className='flex h-full w-[30rem] border border-neutral-500'>
        <ScrollContainer>
          <Transcript blocks={queue?.items} />
        </ScrollContainer>
      </div>
    </div>
  );
};

const meta: Meta<ActivityContainerProps> = {
  title: 'plugins/plugin-meeting/ActivityContainer',
  component: ActivityContainer,
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
        TranscriptionPlugin(),
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

type Story = StoryObj<ActivityContainerProps>;

export const Default: Story = {
  args: {
    // Fixed room for testing.
    roomId: '04a1d1911703b8e929d0649021a965',
  },
};
