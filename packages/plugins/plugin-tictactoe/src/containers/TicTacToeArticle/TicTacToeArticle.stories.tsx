//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { TicTacToe } from '../../types';

import { TicTacToeArticle } from './TicTacToeArticle';

type StoryProps = {
  moves?: number[];
};

const DefaultStory = ({ moves }: StoryProps) => {
  const game = useMemo(() => {
    const g = TicTacToe.make();
    if (moves) {
      Obj.change(g, (obj) => {
        obj.moves = moves;
      });
    }
    return g;
  }, [moves]);

  return <TicTacToeArticle subject={game} />;
};

const meta = {
  title: 'plugins/plugin-tictactoe/containers/TicTacToeArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const MidGame: Story = {
  args: {
    // X:4(center), O:0, X:2, O:6
    moves: [4, 0, 2, 6],
  },
};

export const XWins: Story = {
  args: {
    // X:0,1,2  O:3,4
    moves: [0, 3, 1, 4, 2],
  },
};

export const OWins: Story = {
  args: {
    // X:0,2,3  O:1,4,7
    moves: [0, 1, 2, 4, 3, 7],
  },
};

export const Draw: Story = {
  args: {
    // X O X / X X O / O X O
    moves: [0, 1, 2, 5, 3, 6, 4, 8, 7],
  },
};
