//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React from 'react';

import { CardContainer } from '@dxos/react-ui-stack/testing';
import { withTheme } from '@dxos/storybook-utils';

import { Chess } from '../types';
import { meta } from '../meta';
import { Chessboard } from './Chessboard';

type DefaultStoryProps = {
  role: 'card--popover' | 'card--intrinsic' | 'card--extrinsic';
  game: Chess.Game;
};

const storybook: Meta<DefaultStoryProps> = {
  title: 'plugins/plugin-chess/Card',
  render: ({ role, game }) => (
    <CardContainer icon={meta.icon} role={role}>
      <Chessboard.Root game={game}>
        <Chessboard.Content role={role}>
          <Chessboard.Board />
        </Chessboard.Content>
      </Chessboard.Root>
    </CardContainer>
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
  tags: ['cards'],
};

export default storybook;

const game = Chess.makeGame({
  pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 14. bxc3 *',
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
