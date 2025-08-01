//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { CardContainer } from '@dxos/react-ui-stack/testing';
import { defaultTx } from '@dxos/react-ui-theme';
import { render, withLayout } from '@dxos/storybook-utils';

import ChessContainer from './ChessContainer';
import { ChessType } from '../types';
import { meta } from '../meta';

// TODO(burdon): Factor out variance.
type DefaultStoryProps = {
  role: 'card--popover' | 'card--intrinsic' | 'card--extrinsic';
};

// TODO(burdon): This is the standard name for our stories (we can change it).
const DefaultStory = ({ role }: DefaultStoryProps) => {
  // TODO(burdon): This doesn't need to use Space (see MarkdownPreview).
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const games = useQuery(space, Filter.type(ChessType));
  const [game, setGame] = useState<ChessType>();

  useEffect(() => {
    if (games.length && !game) {
      const board = games[0];
      setGame(board);
    }
  }, [games]);

  if (!game) {
    return null;
  }

  return (
    <CardContainer icon={meta.icon} role={role}>
      <ChessContainer game={game} role={role} />
    </CardContainer>
  );
};

const storybook: Meta<DefaultStoryProps> = {
  title: 'plugins/plugin-chess/Card', // TODO(burdon): Name filename and test consistently (for all plugins that provide cards).
  render: render(DefaultStory),
  decorators: [
    withLayout(),
    // TODO(burdon): This shouldn't require plugin manager? Reconcile with all other preview stories.
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        // TODO(burdon): Client is not required.
        ClientPlugin({
          types: [ChessType],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            const space = await client.spaces.create();
            await space.waitUntilReady();
            const game = Obj.make(ChessType, {
              name: 'Example Chess Game',
              playerWhite: 'Player 1',
              playerBlack: 'Player 2',
              moves: [],
              pgn: '',
              fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting position
            });
            space.db.add(game);
          },
        }),
        StorybookLayoutPlugin(),
        SpacePlugin(),
        IntentPlugin(),
        SettingsPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['cards'],
};

export default storybook;

export const Popover = {
  args: {
    role: 'card--popover',
  },
};

export const Intrinsic = {
  args: {
    role: 'card--intrinsic',
  },
};

export const Extrinsic = {
  args: {
    role: 'card--extrinsic',
  },
};
