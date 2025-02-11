//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Board, type BoardProps } from './Board';
import { getPieces } from '../Chessboard';

const meta: Meta<BoardProps> = {
  title: 'ui/react-ui-gameboard/Board',
  component: Board,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<BoardProps>;

export const Default: Story = {
  args: {
    pieces: getPieces(),
    // pieces: getPieces('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
  },
};
