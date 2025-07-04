//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Chessboard, type ChessboardProps } from './Chessboard';
import { ChessModel } from './chess';
import { Board, type BoardRootProps, type Player, type Move } from '../Board';

type RenderProps = Pick<ChessboardProps, 'orientation' | 'showLabels' | 'debug'> & {
  fen: string;
};

const DefaultStory = ({ fen, orientation: _orientation, ...props }: RenderProps) => {
  const model = useMemo(() => new ChessModel(fen), [fen]);
  const [orientation, setOrientation] = useState<Player | undefined>(_orientation);

  const handleDrop = useCallback<NonNullable<BoardRootProps['onDrop']>>(
    (move: Move) => {
      log.info('handleDrop', { move });
      return model.makeMove(move);
    },
    [model],
  );

  return (
    <div className='flex flex-col grow gap-2 overflow-hidden'>
      <Toolbar.Root>
        <Button onClick={() => model.initialize()}>Reset</Button>
        <Button onClick={() => model.makeRandomMove()}>Move</Button>
        <div className='grow'></div>
        <Button
          onClick={() => setOrientation((orientation) => (!orientation || orientation === 'white' ? 'black' : 'white'))}
        >
          Toggle
        </Button>
      </Toolbar.Root>
      <Board.Root model={model} onDrop={handleDrop}>
        <Chessboard orientation={orientation} {...props} />
      </Board.Root>
    </div>
  );
};

const Grid = (props: RenderProps) => {
  const models = useMemo(() => Array.from({ length: 9 }).map(() => new ChessModel()), []);
  useEffect(() => {
    const i = setInterval(() => {
      const model = models[Math.floor(Math.random() * models.length)];
      model.makeRandomMove();
    }, 100);
    return () => clearInterval(i);
  }, []);

  return (
    <div className='h-full aspect-square mx-auto'>
      <div className='grid grid-cols-3 gap-2'>
        {models.map((model, i) => (
          <div key={i} className='aspect-square'>
            <Board.Root model={model}>
              <Chessboard />
            </Board.Root>
          </div>
        ))}
      </div>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-gameboard/Chessboard',
  component: Chessboard,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: '' })],
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {};

export const Promotion: Story = {
  args: {
    fen: '4k3/7P/8/8/8/8/1p6/4K3 w - - 0 1',
  },
};

export const Debug: Story = {
  args: {
    debug: true,
    showLabels: true,
    orientation: 'black',
    fen: 'q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17',
  },
};

export const Nine: Story = {
  render: Grid,
};
