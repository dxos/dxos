//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';
import { withClientProvider } from '@dxos/react-client/testing';
import { type Player } from '@dxos/react-ui-gameboard';

import { Chessboard } from './Chessboard';
import { Chess } from '../types';
import { translations } from '../translations';

const DefaultStory = ({ game }: { game: Chess.Game }) => {
  const [orientation, setOrientation] = useState<Player>('white');
  return (
    <Chessboard.Root game={game}>
      <div className='grid grid-cols-[1fr_min-content] grid-rows-[1fr_4rem] bs-full is-full gap-2'>
        <Chessboard.Content>
          <Chessboard.Board orientation={orientation} />
        </Chessboard.Content>
        <div className='flex flex-col justify-center items-center p-8'>
          <Chessboard.Info orientation={orientation} onOrientationChange={setOrientation} />
        </div>
        <div className='flex justify-center items-center'>
          <Chessboard.Players />
        </div>
      </div>
    </Chessboard.Root>
  );
};

const meta: Meta<typeof Chessboard.Root> = {
  title: 'plugins/plugin-chess/Chessboard',
  component: Chessboard.Root,
  render: DefaultStory,
  decorators: [withClientProvider({ createIdentity: true }), withTheme, withLayout({ fullscreen: true })],
  parameters: {
    translations,
  },
};

type Story = StoryObj<typeof Chessboard.Root>;

export default meta;

export const Default = {
  args: {
    game: Chess.makeGame(),
  },
} satisfies Story;

export const EndGame = {
  args: {
    game: Chess.makeGame({
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 14. bxc3 *',
    }),
  },
} satisfies Story;
