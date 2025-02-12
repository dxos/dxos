//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import { Chess, validateFen } from 'chess.js';
import React, { useMemo, useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { getPieces, makeMove } from './chess';
import { Board, type Player, type PieceMap } from '../Board';

// TODO(burdon): Wrap model.
// TODO(burdon): Promotion.
const Render = ({ fen }: { fen: string }) => {
  const game = useMemo(() => new Chess(validateFen(fen).ok ? fen : undefined), [fen]);
  const [pieces, setPieces] = useState<PieceMap>(getPieces(game));
  const [orientation, setOrientation] = useState<Player>('white');

  const handleReset = () => {
    game.reset();
    setPieces(getPieces(game));
  };

  const handleMove = () => {
    const moves = game.moves();
    if (moves.length > 0) {
      const move = moves[Math.floor(Math.random() * moves.length)];
      game.move(move);
      setPieces(getPieces(game));
    }
  };

  return (
    <div className='flex flex-col grow gap-2 overflow-hidden'>
      <Toolbar.Root>
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={handleMove}>Move</Button>
        <Button onClick={() => setOrientation((orientation) => (orientation === 'white' ? 'black' : 'white'))}>
          Toggle
        </Button>
      </Toolbar.Root>
      <Board
        pieces={pieces}
        orientation={orientation}
        showLabels={true}
        debug={true}
        isValidMove={(move) => {
          return makeMove(new Chess(game.fen()), move) !== null;
        }}
        onDrop={(move) => {
          if (!makeMove(game, move)) {
            return false;
          }

          setPieces(getPieces(game));
          return true;
        }}
      />
    </div>
  );
};

const meta: Meta<typeof Render> = {
  title: 'ui/react-ui-gameboard/Chessboard',
  // component: Board,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof Render>;

export const Default: Story = {
  args: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    // fen: '8/7k/8/8/8/8/8/K7 w - - 0 1',
  },
};
