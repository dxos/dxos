//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { PostStack, type PostStackAction } from '../../components';
import { generateFeed, generatePosts } from '../../testing';
import { type Subscription } from '#types';

type FeedArticleStoryProps = {
  feedUrl?: string;
};

const useFeedData = (feedUrl?: string): { feed: Subscription.Feed; posts: Subscription.Post[] } | undefined => {
  const [data, setData] = useState<{ feed: Subscription.Feed; posts: Subscription.Post[] }>();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (feedUrl) {
        const { fetchRss } = await import('../../util/fetch-rss');
        const result = await fetchRss(feedUrl, { corsProxy: '/api/rss?url=' });
        if (!cancelled) {
          setData(result);
        }
      } else {
        const feed = generateFeed();
        const posts = generatePosts(50);
        if (!cancelled) {
          setData({ feed, posts });
        }
      }
    };

    void load().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [feedUrl]);

  return data;
};

const DefaultStory = ({ feedUrl }: FeedArticleStoryProps) => {
  const data = useFeedData(feedUrl);
  const [currentPostId, setCurrentPostId] = useState<string>();

  const handleAction = (action: PostStackAction) => {
    if (action.type === 'current') {
      setCurrentPostId(action.postId);
    }
  };

  if (!data) {
    return null;
  }

  const { feed, posts } = data;

  return (
    <Panel.Root role='article' className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{feed.name}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <PostStack id='story-feed' posts={posts} currentId={currentPostId} onAction={handleAction} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-feed/containers/FeedArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FromRss: Story = {
  args: {
    feedUrl: 'https://hnrss.org/frontpage',
  },
};
