//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { SubscriptionStack, type SubscriptionStackAction } from '../../components';
import { Subscription } from '../../types';

const createFeeds = (count: number): Subscription.Feed[] =>
  Array.from({ length: count }, (_, index) =>
    Subscription.makeFeed({
      name: `Feed ${index + 1}`,
      url: `https://example.com/feed-${index + 1}.xml`,
      description: `Description for feed ${index + 1}.`,
    }),
  );

const SubscriptionArticleStory = () => {
  const feeds = useMemo(() => createFeeds(10), []);
  const [currentId, setCurrentId] = useState<string>();

  const handleAction = (action: SubscriptionStackAction) => {
    if (action.type === 'current') {
      setCurrentId(action.feedId);
    }
  };

  return (
    <Panel.Root role='article'>
      <Panel.Content asChild>
        <SubscriptionStack id='story' feeds={feeds} currentId={currentId} onAction={handleAction} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta: Meta<typeof SubscriptionArticleStory> = {
  title: 'plugins/plugin-feed/containers/SubscriptionArticle',
  component: SubscriptionArticleStory,
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
