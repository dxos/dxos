//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { DataTypes } from '@dxos/schema';

import { createNotebook } from '../testing';
import { translations } from '../translations';
import { Notebook } from '../types';

import { NotebookContainer } from './NotebookContainer';

const meta = {
  title: 'plugins/plugin-script/NotebookContainer',
  component: NotebookContainer,
  render: (args) => {
    const client = useClient();
    const space = client.spaces.default;
    const notebooks = useQuery(space?.db, Filter.type(Notebook.Notebook));
    return <NotebookContainer {...args} notebook={notebooks[0]} />;
  },
  decorators: [
    withTheme,
    withLayout({ container: 'column', classNames: 'is-prose' }),
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [...DataTypes, Notebook.Notebook],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            const space = client.spaces.default;
            await space.waitUntilReady();
            space.db.add(createNotebook());
          },
        }),
        SpacePlugin({}),
        SettingsPlugin(),
        IntentPlugin(),
        AutomationPlugin(),
      ],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof NotebookContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
