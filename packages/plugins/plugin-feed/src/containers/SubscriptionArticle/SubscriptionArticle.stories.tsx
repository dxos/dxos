//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { Subscription } from '../../types';

import { SubscriptionArticle } from './SubscriptionArticle';

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
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withAttention(),
    withMosaic(),
    withClientProvider({
      types: [Subscription.Feed, Subscription.Post],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        Array.from({ length: 5 }).forEach(() => {
          space.db.add(
            Subscription.makeFeed({
              name: faker.company.name() + ' Blog',
              url: faker.internet.url(),
              description: faker.lorem.sentence(),
            }),
          );
        });
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
