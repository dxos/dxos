//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Operation } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { AssistantPlugin } from '@dxos/plugin-assistant/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { ExplorerPlugin } from '@dxos/plugin-explorer/testing';
import { Markdown } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Config, useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { DataTypes } from '@dxos/schema';

import { createNotebook } from '#testing';
import { translations } from '#translations';
import { Notebook } from '#types';

import { NotebookArticle } from './NotebookArticle';

const meta: Meta<typeof NotebookArticle> = {
  title: 'plugins/plugin-script/containers/NotebookArticle',
  component: NotebookArticle,
  render: (args) => {
    const client = useClient();
    const space = client.spaces.get()[0];
    const notebooks = useQuery(space?.db, Filter.type(Notebook.Notebook));
    return <NotebookArticle {...args} subject={notebooks[0]} attendableId='test' />;
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
              const { personalSpace } = yield* initializeIdentity(client);

              personalSpace.db.add(createNotebook());
              personalSpace.db.add(Markdown.make({ content: '# Hello World' }));
              personalSpace.db.add(Operation.serialize(AgentPrompt));
            }),
        }),
        AssistantPlugin(),
        RoutinePlugin(),
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
    role: AppSurface.Article.role,
    subject: undefined as any,
  },
};
