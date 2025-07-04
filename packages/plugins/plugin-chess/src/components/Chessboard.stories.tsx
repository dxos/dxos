//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Board, Chessboard, ChessModel } from '@dxos/react-ui-gameboard';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ChessPanel } from './ChessPanel';

const DefaultStory = () => {
  const model = useMemo(() => new ChessModel(), []);

  return (
    <div className='flex grow mx-8 gap-8 items-center overflow-hidden'>
      <Board.Root model={model} onDrop={(move) => model.makeMove(move)}>
        <Chessboard />
      </Board.Root>
      <ChessPanel model={model} classNames='w-[200px]' />
    </div>
  );
};

const meta: Meta<typeof Chessboard> = {
  title: 'plugins/plugin-chess/Chessboard',
  component: Chessboard,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

type Story = StoryObj<typeof Chessboard>;

export default meta;

export const Default: Story = {};
