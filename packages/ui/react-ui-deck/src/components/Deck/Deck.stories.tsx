//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Deck, Plank } from './Deck';
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
        <Plank.Root>
          <Plank.Content classNames='bg-cyan-500'>1</Plank.Content>
        </Plank.Root>
        <Plank.Root>
          <Plank.Content classNames='bg-teal-500'>2</Plank.Content>
        </Plank.Root>
        <Plank.Root>
          <Plank.Content classNames='bg-emerald-500'>3</Plank.Content>
        </Plank.Root>
      </Deck.Root>
    );
  },
};
