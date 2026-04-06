//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { Subscription } from '#types';

import { SubscriptionStack, type SubscriptionStackAction } from './SubscriptionStack';

const generateFeeds = (count: number): Subscription.Feed[] =>
  Array.from({ length: count }, () =>
    Subscription.makeFeed({
      name: faker.company.name() + ' Blog',
      url: faker.internet.url(),
      description: faker.lorem.sentence(),
    }),
  );

const DefaultStory = () => {
  const feeds = useMemo(() => generateFeeds(10), []);
  const [currentId, setCurrentId] = useState<string>();

  const handleAction = (action: SubscriptionStackAction) => {
    if (action.type === 'current') {
      setCurrentId(action.feedId);
    }
  };

  return <SubscriptionStack id='story' feeds={feeds} currentId={currentId} onAction={handleAction} />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-feed/components/SubscriptionStack',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
