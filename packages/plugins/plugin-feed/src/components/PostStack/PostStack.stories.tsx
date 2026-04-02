//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { Builder } from '../../testing';
import { PostStack, type PostStackProps } from './PostStack';

const PostStackStory = (props: Omit<PostStackProps, 'id' | 'posts'>) => {
  const { posts } = useMemo(() => new Builder().createPosts(100).build(), []);
  return <PostStack id='story' posts={posts} {...props} />;
};

const meta: Meta<typeof PostStackStory> = {
  title: 'plugins/plugin-feed/components/PostStack',
  component: PostStackStory,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
};

export const Responsive: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[30rem]' }), withAttention(), withMosaic()],
};
