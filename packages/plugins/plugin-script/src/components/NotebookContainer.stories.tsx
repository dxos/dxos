//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Agent } from '@dxos/assistant-toolkit';
import { Filter } from '@dxos/echo';
import { Function, serializeFunction } from '@dxos/functions';
import { AssistantPlugin } from '@dxos/plugin-assistant';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ClientPlugin } from '@dxos/plugin-client';
import { ExplorerPlugin } from '@dxos/plugin-explorer';
import { Markdown, MarkdownPlugin } from '@dxos/plugin-markdown';
import { SpacePlugin } from '@dxos/plugin-space';
import { Config, useClient } from '@dxos/react-client';
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
    withLayout({ layout: 'column', classNames: 'is-prose' }),
    withPluginManager({
      plugins: [
        ClientPlugin({
          // TODO(wittjosiah): ComputeRuntime requires edge to be configured or it will throw.
          config: new Config({
            runtime: {
              services: SERVICES_CONFIG.REMOTE,
            },
          }),
          types: [...DataTypes, Notebook.Notebook, Function.Function, Markdown.Document],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            const space = client.spaces.default;
            await space.waitUntilReady();

            space.db.add(createNotebook());
            space.db.add(Markdown.make({ content: '# Hello World' }));
            space.db.add(serializeFunction(Agent.prompt));
          },
        }),
        SpacePlugin({}),
        SettingsPlugin(),
        IntentPlugin(),
        AssistantPlugin(),
        AutomationPlugin(),
        ExplorerPlugin(),
        MarkdownPlugin(),
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
