//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';
import { Chess } from '../types';

import { ChessboardArticle } from './ChessboardArticle';

const meta = {
  title: 'plugins/plugin-chess/Chessboard',
  component: ChessboardArticle,
  decorators: [withTheme, withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ChessboardArticle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    game: Chess.makeGame(),
  },
};

export const EndGame: Story = {
  args: {
    game: Chess.makeGame({
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 *',
    }),
  },
};

export const Promption: Story = {
  args: {
    game: Chess.makeGame({
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 14. d5 Qg5 15. dxe6 Qg4 16. e7 Kf7 17. bxc3 Kg6 *',
    }),
  },
};
