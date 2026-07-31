//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Subscription } from '#types';

import { MagazinePlugin } from '../../MagazinePlugin';
import { SubscriptionsArticle } from './SubscriptionsArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const feeds = useQuery(space?.db, Filter.type(Subscription.Subscription));
  if (!space || feeds.length === 0) {
    return <Loading />;
  }

  return <SubscriptionsArticle role='article' space={space} attendableId='story' />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-magazine/containers/SubscriptionsArticle',
  component: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Subscription.Subscription, Subscription.Post],
          onClientInitialized: ({ client }: { client: Client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = (yield* Effect.promise(() => client.spaces.create())) as Space;
              yield* Effect.promise(() => space.waitUntilReady());
              Array.from({ length: 5 }).forEach(() => {
                space.db.add(
                  Subscription.makeSubscription({
                    name: random.company.name() + ' Blog',
                    url: random.internet.url(),
                    description: random.lorem.paragraphs(3),
                  }),
                );
              });
            }),
        }),
        SpacePlugin({}),
        StorybookPlugin({}),
        MagazinePlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
