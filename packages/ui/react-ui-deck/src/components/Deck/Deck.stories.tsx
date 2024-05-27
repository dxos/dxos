//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Deck } from './Deck';
import translations from '../../translations';

export default {
  title: 'react-ui-deck/Deck',
  component: Deck.Root,
  decorators: [withTheme],
  parameters: { translations, layout: 'fullscreen' },
};

export const Simple = {
  args: {},
  render: () => {
    return (
      <Deck.Root classNames='fixed inset-0 z-0'>
        <Deck.Plank classNames='bg-cyan-500'>1</Deck.Plank>
        <Deck.Plank classNames='bg-teal-500'>2</Deck.Plank>
        <Deck.Plank classNames='bg-emerald-500'>3</Deck.Plank>
      </Deck.Root>
    );
  },
};
