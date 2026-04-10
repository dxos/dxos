//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { Journal, Outline } from '#types';

import { translations } from '../../translations';
import { JournalContainer } from './JournalContainer';

const DefaultStory = () => {
  const space = useSpace();
  const journal = useMemo(() => {
    if (space) {
      return space.db.add(Journal.make());
    }
    return undefined;
  }, [space]);

  if (!journal) {
    return null;
  }

  return <JournalContainer role='article' subject={journal} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-outliner/containers/JournalContainer',
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

