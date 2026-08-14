//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Blog } from '#types';

import { PostCard } from './PostCard';

// The ECHO `Post` is built inside the render function (never at module scope) so each story
// mount gets its own object instance.
const DefaultStory = ({ untitled }: { untitled?: boolean }) => {
  const post = useMemo(
    () =>
      untitled
        ? Blog.makePost({})
        : Blog.makePost({ name: 'Sample Post', description: 'A short summary of the post.' }),
    [untitled],
  );
  return <PostCard post={post} onClick={() => {}} />;
};

const meta = {
  title: 'plugins/plugin-blogger/PostCard',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Untitled: Story = { args: { untitled: true } };
