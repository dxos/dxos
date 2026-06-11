//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { CardContainer } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { Bookmark } from '#types';

import { BookmarkCard } from './BookmarkCard';

const CardStory = () => {
  const bookmark = useMemo(
    () =>
      Bookmark.make({
        title: 'DXOS',
        url: 'https://dxos.org',
        excerpt: 'The decentralized operating system.',
      }),
    [],
  );

  return (
    <CardContainer role='popover' icon={pluginMeta.icon}>
      <BookmarkCard role='card--content' subject={bookmark} />
    </CardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-bookmarks/containers/BookmarkCard',
  render: () => <CardStory />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['cards'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Popover: Story = {};
