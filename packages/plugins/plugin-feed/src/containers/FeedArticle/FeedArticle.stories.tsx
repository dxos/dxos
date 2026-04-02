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
import { type BuildResult, Builder } from '../../testing';

type FeedArticleStoryProps = {
  feedUrl?: string;
};

const useFeedData = (feedUrl?: string): BuildResult | undefined => {
  const [data, setData] = useState<BuildResult>();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const builder = new Builder();
      if (feedUrl) {
        await builder.fromRss(feedUrl, { corsProxy: '/api/rss?url=' });
      } else {
        builder.createPosts(50);
      }
      if (!cancelled) {
        setData(builder.build());
      }
    };

    void load().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [feedUrl]);

  return data;
};

/** Standalone FeedArticle story that renders PostStack with generated or real RSS data. */
const FeedArticleStory = ({ feedUrl }: FeedArticleStoryProps) => {
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
          <h2 className='text-lg font-medium'>{feed.name}</h2>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <PostStack id='story-feed' posts={posts} currentId={currentPostId} onAction={handleAction} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta: Meta<typeof FeedArticleStory> = {
  title: 'plugins/plugin-feed/containers/FeedArticle',
  component: FeedArticleStory,
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
