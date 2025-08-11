//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';
import { Chess } from '../types';

import { ChessboardArticle } from './ChessboardArticle';

const meta: Meta<typeof ChessboardArticle> = {
  title: 'plugins/plugin-chess/Chessboard',
  component: ChessboardArticle,
  decorators: [withClientProvider({ createIdentity: true }), withTheme, withLayout({ fullscreen: true })],
  parameters: {
    translations,
  },
};

type Story = StoryObj<typeof meta>;

export default meta;

export const Default = {
  args: {
    game: Chess.makeGame(),
  },
} satisfies Story;

export const EndGame = {
  args: {
    game: Chess.makeGame({
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 *',
    }),
  },
} satisfies Story;

export const Promption = {
  args: {
    game: Chess.makeGame({
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 14. d5 Qg5 15. dxe6 Qg4 16. e7 Kf7 17. bxc3 Kg6 *',
    }),
  },
} satisfies Story;
