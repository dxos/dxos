//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { generateMagazine } from '#testing';
import { Magazine, Subscription } from '#types';

import { FeedPlugin } from '../../FeedPlugin';
import { translations } from '../../translations';
import { MagazineProperties } from './MagazineProperties';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [magazine] = useQuery(space?.db, Filter.type(Magazine.Magazine));
  if (!magazine) {
    return <Loading />;
  }

  return (
    <ObjectProperties object={magazine}>
      <MagazineProperties role='object-properties' subject={magazine} />
    </ObjectProperties>
  );
};

const meta = {
  title: 'plugins/plugin-feed/containers/MagazineProperties',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Magazine.Magazine, Subscription.Feed, Subscription.Post, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              space.db.add(
                generateMagazine({
                  name: 'Distributed Systems Reading',
                  instructions: 'Surface articles about distributed systems and local-first software.',
                }),
              );
            }),
        }),
        FeedPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
