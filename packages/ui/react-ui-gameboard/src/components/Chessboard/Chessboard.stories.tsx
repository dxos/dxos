//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Gameboard, type GameboardRootProps, type Move, type Player } from '../Gameboard';

import { ChessModel } from './chess';
import { Chessboard, type ChessboardProps } from './Chessboard';

type DefaultStoryProps = Pick<ChessboardProps, 'orientation' | 'showLabels' | 'debug'> & {
  pgn?: string;
};

const DefaultStory = ({ orientation: _orientation, pgn, ...props }: DefaultStoryProps) => {
  const model = useMemo(() => new ChessModel(pgn), [pgn]);
  const [orientation, setOrientation] = useState<Player | undefined>(_orientation);

  const handleDrop = useCallback<NonNullable<GameboardRootProps<ChessModel>['onDrop']>>(
    (move: Move) => {
      const result = model.makeMove(move);
      console.log(model.pgn);
      return result;
    },
    [model],
  );

  return (
    <div className='flex flex-col grow gap-2 overflow-hidden'>
      <Toolbar.Root>
        <Button onClick={() => model.update()}>Reset</Button>
        <Button onClick={() => model.makeRandomMove()}>Move</Button>
        <div className='grow'></div>
        <Button
          onClick={() => setOrientation((orientation) => (!orientation || orientation === 'white' ? 'black' : 'white'))}
        >
          Toggle
        </Button>
      </Toolbar.Root>
      <Gameboard.Root model={model} onDrop={handleDrop}>
        <Gameboard.Content grow contain>
          <Chessboard orientation={orientation} {...props} />
        </Gameboard.Content>
      </Gameboard.Root>
    </div>
  );
};

const GridStory = () => {
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
            <Gameboard.Root model={model}>
              <Chessboard />
            </Gameboard.Root>
          </div>
        ))}
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-gameboard/Chessboard',
  component: Chessboard,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'column',
  },
} satisfies Meta<typeof Chessboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Promotion: Story = {
  args: {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 14. d5 Qg5 15. dxe6 Kf8 16. e7+ Kg8 *',
  },
};

export const Debug: Story = {
  args: {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 *',
    orientation: 'black',
    showLabels: true,
    debug: true,
  },
};

export const Grid = {
  render: GridStory,
};
