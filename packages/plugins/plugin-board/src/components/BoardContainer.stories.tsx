//
// Copyright 2024 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
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
import { Filter, Ref, useQuery, useSpaces } from '@dxos/react-client/echo';
import { withTheme } from '@dxos/react-ui/testing';
import { translations as stackTranslations } from '@dxos/react-ui-stack';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';

import { translations } from '../translations';
import { Board } from '../types';

import { BoardContainer } from './BoardContainer';

faker.seed(0);

const createBoard = () =>
  Obj.make(Board.Board, {
    name: 'Test Board',
    items: [],
    layout: {
      size: { width: 7, height: 5 },
      cells: {},
    },
  });

const createOrg = () =>
  Obj.make(DataType.Organization, {
    name: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    image: faker.image.url(),
    website: faker.internet.url(),
    // TODO(burdon): Fix.
    // status: faker.helpers.arrayElement(DataType.OrganizationStatusOptions).id,
  });

const DefaultStory = () => {
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

//
// Story definitions
//

const meta = {
  title: 'plugins/plugin-board/Board',
  render: DefaultStory,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [DataType.Organization, DataType.Person, Board.Board],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            const space = await client.spaces.create();
            await space.waitUntilReady();
            const board = space.db.add(createBoard());

            // Add some sample items
            Array.from({ length: 10 }).map(() => {
              const org = createOrg();
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
        SpacePlugin(),
        IntentPlugin(),
        SettingsPlugin(),

        // UI
        ThemePlugin({ tx: defaultTx }),
        PreviewPlugin(),
        StorybookLayoutPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...stackTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
