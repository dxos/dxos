//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useCallback, useMemo, useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Chessboard, type ChessboardProps } from './Chessboard';
import { ChessModel } from './chess';
import { Board, type BoardRootProps, type Player, type Move } from '../Board';

type RenderProps = Pick<ChessboardProps, 'orientation' | 'showLabels' | 'debug'> & {
  fen: string;
};

const Render = ({ fen, orientation: _orientation, ...props }: RenderProps) => {
  const model = useMemo(() => new ChessModel(fen), [fen]);
  const [orientation, setOrientation] = useState<Player | undefined>(_orientation);

  const handleDrop = useCallback<NonNullable<BoardRootProps['onDrop']>>((move: Move) => model.makeMove(move), [model]);

  return (
    <div className='flex flex-col grow gap-2 overflow-hidden'>
      <Toolbar.Root>
        <Button onClick={() => model.initialize()}>Reset</Button>
        <Button onClick={() => model.makeRandomMove()}>Move</Button>
        <div className='grow'></div>
        <Button onClick={() => setOrientation((orientation) => (orientation === 'white' ? 'black' : 'white'))}>
          Toggle
        </Button>
      </Toolbar.Root>
      <Board.Root model={model} onDrop={handleDrop}>
        <Chessboard orientation={orientation} {...props} />
      </Board.Root>
    </div>
  );
};

const meta: Meta<typeof Render> = {
  title: 'ui/react-ui-gameboard/Chessboard',
  component: Chessboard,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof Render>;

export const Default: Story = {};

export const Debug: Story = {
  args: {
    debug: true,
    showLabels: true,
    orientation: 'black',
    fen: 'q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17',
  },
};
