//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Journal, Outline } from '#types';

import { JournalArticle } from './JournalArticle';

const DefaultStory = () => {
  const [space] = useSpaces();
  const journal = useMemo(() => {
    if (space) {
      return space.db.add(Journal.make());
    }
    return undefined;
  }, [space]);

  if (!journal) {
    return null;
  }

  return <JournalArticle role='article' subject={journal} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-outliner/containers/JournalArticle',
  component: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Text.Text, Journal.Journal, Journal.JournalEntry, Outline.Outline],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
