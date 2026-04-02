//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { PostStack, type PostStackAction } from '../../components';
import { type BuildResult, Builder } from '../../testing';
import { type Subscription } from '../../types';

type FeedArticleStoryProps = {
  feedUrl?: string;
};

/** Standalone FeedArticle story that renders PostStack with generated or real RSS data. */
const FeedArticleStory = ({ feedUrl }: FeedArticleStoryProps) => {
  const fakeData = useMemo(() => new Builder().createPosts(50).build(), []);
  const [rssData, setRssData] = useState<BuildResult>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!feedUrl) {
      return;
    }
    let cancelled = false;
    new Builder()
      .fromRss(feedUrl)
      .then((builder) => {
        if (!cancelled) {
          setRssData(builder.build());
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [feedUrl]);

  const { feed, posts }: { feed: Subscription.Feed; posts: Subscription.Post[] } = rssData ?? fakeData;
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
        {error && <p className='p-2 text-sm text-error'>{error}</p>}
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

export const FromRss: Story = {
  args: {
    feedUrl: 'https://hnrss.org/frontpage',
  },
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
};
