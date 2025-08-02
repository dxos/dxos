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
import { useClient } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { CardContainer } from '@dxos/react-ui-stack/testing';
import { defaultTx } from '@dxos/react-ui-theme';
import { withLayout } from '@dxos/storybook-utils';

import ChessContainer from './ChessContainer';
import { Chess } from '../types';

type StoryProps = {
  role: 'card--popover' | 'card--intrinsic' | 'card--extrinsic';
};

const render: Meta<StoryProps>['render'] = ({ role }) => {
  const _client = useClient();
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const games = useQuery(space, Filter.type(Chess.Game));
  const [game, setGame] = useState<Chess.Game>();

  useEffect(() => {
    if (games.length && !game) {
      const board = games[0];
      setGame(board);
    }
  }, [games]);

  if (!game) {
    return <span>…</span>;
  }

  return (
    <CardContainer icon='ph--castle-turret--regular' role={role}>
      <ChessContainer game={game} role={role} />
    </CardContainer>
  );
};

const meta: Meta<StoryProps> = {
  title: 'Cards/plugin-chess',
  render,
  decorators: [
    withLayout(),
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        ClientPlugin({
          types: [Chess.Game],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            const space = await client.spaces.create();
            await space.waitUntilReady();
            const game = Obj.make(Chess.Game, {
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
};

export default meta;

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
