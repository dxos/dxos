//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Panel } from '@dxos/react-ui';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { generateFeed } from '../testing';
import { translations } from '../translations';
import { Magazine, Subscription } from '../types';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [magazine] = useQuery(space?.db, Filter.type(Magazine.Magazine));
  if (!magazine) {
    return <Loading />;
  }

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ObjectProperties object={magazine} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-feed/MagazineProperties',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Magazine.Magazine, Subscription.Feed, Subscription.Post, Tag.Tag, Text.Text],
      onCreateSpace: async ({ space }) => {
        // Pre-seed a couple of feeds so the Feeds combobox has options to pick from,
        // exercising both "select existing" and "create new" flows.
        space.db.add(generateFeed({ name: 'Apple Newsroom', url: 'https://www.apple.com/newsroom/rss-feed.rss' }));
        space.db.add(generateFeed({ name: 'Vercel Changelog', url: 'https://vercel.com/changelog/feed' }));
        space.db.add(Magazine.make({ name: 'Distributed Systems Reading' }));
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default Magazine ObjectProperties — exercises the auto-generated form,
 * including the markdown editor for `instructions` and the Feeds picker.
 *
 * Repro for "can't add a feed in MagazineProperties":
 * 1. Open the Feeds combobox.
 * 2. Either pick an existing feed, or fill out the inline create form to add a new one.
 * 3. Verify the feed appears in the magazine's feeds array (currently broken — does not persist).
 */
export const Default: Story = {};
