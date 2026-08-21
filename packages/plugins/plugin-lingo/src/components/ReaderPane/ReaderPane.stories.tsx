//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type VocabularyLookup, normalizeToken } from '#extensions';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

import { createTooltipRenderer } from '../../containers/ReaderArticle/renderTooltip';
import { TEST_PASSAGE, makeTestDeck } from '../../testing';
import { ReaderPane } from './ReaderPane';

const ReaderPaneStory = ({ translate }: { translate?: boolean }) => {
  const { t } = useTranslation(pluginMeta.profile.key);
  const lookup = useMemo<VocabularyLookup>(() => {
    const { words } = makeTestDeck();
    const index = new Map(
      words.map((word) => [
        normalizeToken(word.term),
        {
          term: word.term,
          translation: word.translation,
          reading: word.reading,
          partOfSpeech: word.partOfSpeech,
          wordId: word.id,
        },
      ]),
    );
    return (token) => index.get(token);
  }, []);

  // The hover card is only registered when `render` is supplied, so the story passes the same
  // renderer the container uses; without it the tooltip path is never exercised.
  const render = useMemo(() => createTooltipRenderer({ t, onAdd: ({ token }) => console.log('add', token) }), [t]);

  return (
    <ReaderPane
      content={TEST_PASSAGE}
      lookup={lookup}
      locale='ja'
      render={render}
      translate={translate}
      classNames='h-full'
    />
  );
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
