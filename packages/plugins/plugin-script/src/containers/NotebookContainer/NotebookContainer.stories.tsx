//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Filter } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { AssistantPlugin } from '@dxos/plugin-assistant';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { ExplorerPlugin } from '@dxos/plugin-explorer';
import { Markdown, MarkdownPlugin } from '@dxos/plugin-markdown';
import { corePlugins } from '@dxos/plugin-testing';
import { Config, useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { DataTypes } from '@dxos/schema';

import { createNotebook } from '../../testing';
import { translations } from '../../translations';
import { Notebook } from '../../types';

import { NotebookContainer } from './NotebookContainer';

const meta: Meta<typeof NotebookContainer> = {
  title: 'plugins/plugin-script/containers/NotebookContainer',
  component: NotebookContainer,
  render: (args) => {
    const client = useClient();
    const space = client.spaces.get()[0];
    const notebooks = useQuery(space?.db, Filter.type(Notebook.Notebook));
    return <NotebookContainer {...args} subject={notebooks[0]} attendableId='test' />;
  },
  decorators: [
    withLayout({ layout: 'column', classNames: 'w-document-max-width' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          // TODO(wittjosiah): ComputeRuntime requires edge to be configured or it will throw.
          config: new Config({
            runtime: {
              services: SERVICES_CONFIG.REMOTE,
            },
          }),
          types: [...DataTypes, Notebook.Notebook, Operation.PersistentOperation, Markdown.Document],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);

              defaultSpace.db.add(createNotebook());
              defaultSpace.db.add(Markdown.make({ content: '# Hello World' }));
              defaultSpace.db.add(Operation.serialize(AgentPrompt));
            }),
        }),
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
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: 'article',
    subject: undefined as any,
  },
};
