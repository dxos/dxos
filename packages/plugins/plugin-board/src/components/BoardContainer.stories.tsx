//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { type Client, useClient } from '@dxos/react-client';
import { Filter, Ref, type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { translations as stackTranslations } from '@dxos/react-ui-stack';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { withLayout } from '@dxos/storybook-utils';

import { translations } from '../translations';
import { Board } from '../types';

import { BoardContainer } from './BoardContainer';

faker.seed(0);

//
// Initialization utilities
//

const initializeBoard = async ({ space, client }: { space: Space; client: Client }) => {
  // Create a new board
  const board = Obj.make(Board.Board, {
    name: 'Test Board',
    items: [],
    layout: {
      size: { width: 7, height: 5 },
      cells: {},
    },
  });

  return { board };
};

//
// Story components
//

const rollOrg = () =>
  ({
    name: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    image: faker.image.url(),
    website: faker.internet.url(),
    status: faker.helpers.arrayElement(DataType.OrganizationStatusOptions).id,
    // TODO(thure): Why is this so difficult to type?
  }) as unknown as DataType.Organization;

const StorybookBoard = () => {
  const _client = useClient();
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const boards = useQuery(space, Filter.type(Board.Board));
  const [board, setBoard] = useState<Board.Board>();

  useEffect(() => {
    if (boards.length && !board) {
      const board = boards[0];
      setBoard(board);
    }
  }, [boards]);

  if (!board) {
    return null;
  }

  return <BoardContainer role='board' board={board} />;
};

type StoryProps = {};

//
// Story definitions
//

const meta: Meta<StoryProps> = {
  title: 'plugins/plugin-board/Board',
  component: StorybookBoard,
  render: () => <StorybookBoard />,
  parameters: { translations: [...translations, ...stackTranslations] },
  decorators: [
    withLayout({ fullscreen: true }),
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        ClientPlugin({
          types: [DataType.Organization, DataType.Person, Board.Board],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            const space = await client.spaces.create();
            await space.waitUntilReady();
            const { board } = await initializeBoard({
              space,
              client,
            });
            space.db.add(board);

            // Add some sample items
            Array.from({ length: 10 }).map(() => {
              const org = Obj.make(DataType.Organization, rollOrg());
              space.db.add(org);
              board.items.push(Ref.make(org));
              board.layout.cells[org.id] = {
                x: Math.floor(Math.random() * 5) - 2,
                y: Math.floor(Math.random() * 5) - 2,
                width: 1,
                height: 1,
              };
              return org;
            });
          },
        }),
        StorybookLayoutPlugin(),
        PreviewPlugin(),
        SpacePlugin(),
        IntentPlugin(),
        SettingsPlugin(),
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {};
