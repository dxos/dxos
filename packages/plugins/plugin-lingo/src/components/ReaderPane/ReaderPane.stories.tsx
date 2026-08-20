//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type VocabularyLookup, normalizeToken } from '#extensions';
import { translations } from '#translations';

import { TEST_PASSAGE, makeTestDeck } from '../../testing';
import { ReaderPane } from './ReaderPane';

const ReaderPaneStory = ({ translate }: { translate?: boolean }) => {
  const lookup = useMemo<VocabularyLookup>(() => {
    const { words } = makeTestDeck();
    const index = new Map(
      words.map((word) => [
        normalizeToken(word.term),
        { term: word.term, translation: word.translation, partOfSpeech: word.partOfSpeech, wordId: word.id },
      ]),
    );
    return (token) => index.get(token);
  }, []);

  return <ReaderPane content={TEST_PASSAGE} lookup={lookup} translate={translate} classNames='h-full' />;
};

const meta = {
  title: 'plugins/plugin-lingo/components/ReaderPane',
  render: (args: { translate?: boolean }) => <ReaderPaneStory {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<{ translate?: boolean }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Original: Story = { args: { translate: false } };
export const Translated: Story = { args: { translate: true } };
