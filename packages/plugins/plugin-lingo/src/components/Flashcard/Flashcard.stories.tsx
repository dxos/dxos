//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { makeTestDeck } from '../../testing';
import { Flashcard } from './Flashcard';

const FlashcardStory = () => {
  const { words } = useMemo(() => makeTestDeck(), []);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  return (
    <Flashcard
      word={words[index % words.length]}
      revealed={revealed}
      onReveal={() => setRevealed(true)}
      onAnswer={() => {
        setRevealed(false);
        setIndex((index) => index + 1);
      }}
    />
  );
};

const meta = {
  title: 'plugins/plugin-lingo/components/Flashcard',
  render: () => <FlashcardStory />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
