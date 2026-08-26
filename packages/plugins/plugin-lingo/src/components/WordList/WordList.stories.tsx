//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { makeTestDeck } from '../../testing';
import { WordList } from './WordList';

const WordListStory = () => {
  const { words } = useMemo(() => makeTestDeck(), []);
  return <WordList words={words} />;
};

const meta = {
  title: 'plugins/plugin-lingo/components/WordList',
  render: () => <WordListStory />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
