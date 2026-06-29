//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TicTacToeBoard, type TicTacToeBoardProps } from './TicTacToeBoard';

const InteractiveStory = (args: TicTacToeBoardProps) => {
  const [board, setBoard] = useState(args.board);
  useEffect(() => {
    setBoard(args.board);
  }, [args.board]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const index = row * args.size + col;
      if (board[index] !== '-' || args.disabled) {
        return;
      }
      const xCount = board.split('').filter((c) => c === 'X').length;
      const oCount = board.split('').filter((c) => c === 'O').length;
      const marker = xCount <= oCount ? 'X' : 'O';
      setBoard(board.slice(0, index) + marker + board.slice(index + 1));
    },
    [board, args.size, args.disabled],
  );

  return (
    <div className='flex items-center justify-center h-full w-full p-8'>
      <TicTacToeBoard {...args} board={board} onCellClick={handleCellClick} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-tictactoe/components/TicTacToeBoard',
  component: InteractiveStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof InteractiveStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty3x3: Story = {
  args: {
    board: '---------',
    size: 3,
  },
};

export const MidGame: Story = {
  args: {
    board: 'XO-X--O--',
    size: 3,
  },
};

export const XWins: Story = {
  args: {
    board: 'XXXOO----',
    size: 3,
    winningCells: [0, 1, 2],
    disabled: true,
  },
};

export const Draw: Story = {
  args: {
    board: 'XOXOOXXXO',
    size: 3,
    disabled: true,
  },
};

export const Large5x5: Story = {
  args: {
    board: '-'.repeat(25),
    size: 5,
  },
};

export const Large5x5MidGame: Story = {
  args: {
    board: 'XO---X----O---X----O-----',
    size: 5,
  },
};
