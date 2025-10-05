//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { CardContainer } from '@dxos/react-ui-stack/testing';

import { meta as pluginMeta } from '../meta';
import { Chess } from '../types';

import { Chessboard } from './Chessboard';

type DefaultStoryProps = {
  role: 'card--popover' | 'card--intrinsic' | 'card--extrinsic';
  game: Chess.Game;
};

const meta: Meta<DefaultStoryProps> = {
  title: 'plugins/plugin-chess/Card',
  render: ({ role, game }) => (
    <CardContainer icon={pluginMeta.icon} role={role}>
      <Chessboard.Root game={game}>
        <Chessboard.Content role={role}>
          <Chessboard.Board />
        </Chessboard.Content>
      </Chessboard.Root>
    </CardContainer>
  ),
  parameters: {
    layout: 'centered',
  },
  tags: ['cards'],
};

export default meta;

const game = Chess.makeGame({
  pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 14. d5 Qg5 15. dxe6 Qg4 16. e7 Kf7 17. bxc3 Kg6 *',
});

type Story = StoryObj<typeof meta>;

export const Popover: Story = {
  args: {
    role: 'card--popover',
    game: game,
  },
};

export const Intrinsic: Story = {
  args: {
    role: 'card--intrinsic',
    game: game,
  },
};

export const Extrinsic: Story = {
  args: {
    role: 'card--extrinsic',
    game: game,
  },
};
