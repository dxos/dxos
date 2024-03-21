//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { DeckRoot, DeckColumn } from './Deck';
import translations from '../../translations';

type StorybookDeckProps = {};

const StorybookDeck = (_: StorybookDeckProps) => {
  return (
    <DeckRoot>
      <DeckColumn classNames='bg-cyan-500'>1</DeckColumn>
      <DeckColumn classNames='bg-teal-500'>2</DeckColumn>
      <DeckColumn classNames='bg-emerald-500'>3</DeckColumn>
    </DeckRoot>
  );
};

export default {
  title: 'react-ui-deck/Deck',
  component: StorybookDeck,
  decorators: [withTheme],
  parameters: { translations, layout: 'fullscreen' },
};

export const Default = {
  args: {},
};
