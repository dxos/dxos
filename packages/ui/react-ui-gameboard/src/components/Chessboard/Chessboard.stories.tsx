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
import { Gameboard, type GameboardRootProps, type Player, type Move } from '../Gameboard';

type DefaultStoryProps = Pick<ChessboardProps, 'orientation' | 'showLabels' | 'debug'> & {
  pgn?: string;
};

const DefaultStory = ({ orientation: _orientation, pgn, ...props }: DefaultStoryProps) => {
  const model = useMemo(() => new ChessModel(pgn), [pgn]);
  const [orientation, setOrientation] = useState<Player | undefined>(_orientation);

  const handleDrop = useCallback<NonNullable<GameboardRootProps<ChessModel>['onDrop']>>(
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

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-gameboard/Chessboard',
  component: Chessboard,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: '' })],
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default = {} satisfies Story;

export const Promotion = {} satisfies Story;

export const Debug = {
  args: {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 14. bxc3 *',
    orientation: 'black',
    showLabels: true,
    debug: true,
  },
} satisfies Story;

export const Grid = {
  render: GridStory,
} satisfies Story;
