//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Bookmark } from '#types';

import { BookmarkArticle } from './BookmarkArticle';

const DefaultStory = () => {
  const bookmark = useMemo(
    () =>
      Bookmark.make({
        title: 'DXOS',
        url: 'https://dxos.org',
        excerpt: 'The decentralized operating system.',
      }),
    [],
  );

  return <BookmarkArticle role='article' attendableId='story' subject={bookmark} />;
};

const meta = {
  title: 'plugins/plugin-bookmarks/containers/BookmarkArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
