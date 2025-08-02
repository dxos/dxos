//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React from 'react';

import { Obj } from '@dxos/echo';
import { CardContainer } from '@dxos/react-ui-stack/testing';
import { withTheme } from '@dxos/storybook-utils';

import { ChessType } from '../types';
import { meta } from '../meta';
import { ChessPanel } from './ChessPanel';

type DefaultStoryProps = {
  role: 'card--popover' | 'card--intrinsic' | 'card--extrinsic';
  game: ChessType;
};

const storybook: Meta<DefaultStoryProps> = {
  title: 'plugins/plugin-chess/Card',
  render: ({ role, game }) => (
    <CardContainer icon={meta.icon} role={role}>
      <ChessPanel game={game} role={role} />
    </CardContainer>
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
  tags: ['cards'],
};

export default storybook;

const game = Obj.make(ChessType, {
  name: 'Example Chess Game',
  playerWhite: 'Player 1',
  playerBlack: 'Player 2',
  moves: [],
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
});

type Story = StoryObj<DefaultStoryProps>;

export const Popover = {
  args: {
    role: 'card--popover',
    game: game,
  },
} satisfies Story;

export const Intrinsic = {
  args: {
    role: 'card--intrinsic',
    game: game,
  },
} satisfies Story;

export const Extrinsic = {
  args: {
    role: 'card--extrinsic',
    game: game,
  },
} satisfies Story;
