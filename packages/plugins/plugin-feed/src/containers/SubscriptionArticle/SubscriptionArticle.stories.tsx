//
// Copyright 2025 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { faker } from '@dxos/random';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';

import { FeedPlugin } from '../../FeedPlugin';
import { Subscription } from '../../types';
import { translations } from '../../translations';

import { SubscriptionArticle } from './SubscriptionArticle';

const withFeedPlugins = (): Decorator =>
  withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types: [Subscription.Feed, Subscription.Post],
        onClientInitialized: ({ client }: { client: Client }) =>
          Effect.gen(function* () {
            yield* initializeIdentity(client);
            const space = (yield* Effect.promise(() => client.spaces.create())) as Space;
            yield* Effect.promise(() => space.waitUntilReady());
            Array.from({ length: 5 }).forEach(() => {
              space.db.add(
                Subscription.makeFeed({
                  name: faker.company.name() + ' Blog',
                  url: faker.internet.url(),
                  description: faker.lorem.sentence(),
                }),
              );
            });
          }),
      }),
      SpacePlugin({}),
      StorybookPlugin({}),
      FeedPlugin(),
    ],
  });

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const feeds = useQuery(space?.db, Filter.type(Subscription.Feed));
  const feed = feeds[0];

  if (!feed) {
    return null;
  }

  return <SubscriptionArticle role='article' subject={feed} />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-feed/containers/SubscriptionArticle',
  component: DefaultStory,
  decorators: [withLayout({ layout: 'fullscreen' }), withFeedPlugins()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
