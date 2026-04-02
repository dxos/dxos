//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { PostStack, type PostStackAction } from '../../components';
import { Builder } from '../../testing';

/** Standalone FeedArticle story that renders PostStack with generated test data. */
const FeedArticleStory = () => {
  const { feed, posts } = useMemo(() => new Builder().createPosts(50).build(), []);
  const [currentPostId, setCurrentPostId] = useState<string>();

  const handleAction = (action: PostStackAction) => {
    if (action.type === 'current') {
      setCurrentPostId(action.postId);
    }
  };

  return (
    <Panel.Root role='article' className='dx-document'>
      <Panel.Content>
        <div className='p-2 border-b border-separator'>
          <h2 className='text-lg font-medium'>{feed.name}</h2>
          {feed.description && <p className='text-sm text-description'>{feed.description}</p>}
        </div>
        <PostStack id='story-feed' posts={posts} currentId={currentPostId} onAction={handleAction} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta: Meta<typeof FeedArticleStory> = {
  title: 'plugins/plugin-feed/containers/FeedArticle',
  component: FeedArticleStory,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
};
