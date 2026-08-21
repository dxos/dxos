//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type VocabularyEntry, type VocabularyLookup, deckSegments, normalizeToken } from '#extensions';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

import { createTooltipRenderer } from '../../containers/ReaderArticle/renderTooltip';
import { TEST_PASSAGE, makeTestDeck } from '../../testing';
import { ReaderPane } from './ReaderPane';

const ReaderPaneStory = () => {
  const { t } = useTranslation(pluginMeta.profile.key);
  const [selected, setSelected] = useState<string>();

  const lookup = useMemo<VocabularyLookup>(() => {
    const { words } = makeTestDeck();
    const index = new Map<string, VocabularyEntry>(
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

  // The deck pass is deterministic, so this story exercises segments without a model.
  const analysis = useMemo(() => deckSegments(TEST_PASSAGE, lookup, 'ja'), [lookup]);

  // The popover is only registered when `render` is supplied; without it that path is never
  // exercised.
  const render = useMemo(() => createTooltipRenderer({ t, onAdd: ({ text }) => console.log('add', text) }), [t]);

  return (
    <ReaderPane
      content={TEST_PASSAGE}
      analysis={analysis}
      selected={selected}
      render={render}
      onSelect={(segment) => setSelected(segment?.id)}
      classNames='h-full'
    />
  );
};

const meta = {
  title: 'plugins/plugin-lingo/components/ReaderPane',
  render: () => <ReaderPaneStory />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
