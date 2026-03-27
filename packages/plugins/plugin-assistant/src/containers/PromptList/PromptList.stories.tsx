//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Prompt } from '@dxos/blueprints';
import { Filter } from '@dxos/echo';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ClientPlugin } from '@dxos/plugin-client';
import { Markdown } from '@dxos/plugin-markdown/types';
import { corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Organization } from '@dxos/types';

import { AssistantPlugin } from '../../AssistantPlugin';
import { translations } from '../../translations';
import { TracePanel } from '../TracePanel';

import { PromptList } from './PromptList';

// TODO(burdon): Factor out (see assistant-stories)
export const config = {
  remote: new Config({
    runtime: {
      services: SERVICES_CONFIG.REMOTE,
    },
  }),
  persistent: new Config({
    runtime: {
      client: {
        storage: {
          persistent: true,
        },
      },
      services: SERVICES_CONFIG.REMOTE,
    },
  }),
  local: new Config({
    runtime: {
      services: SERVICES_CONFIG.LOCAL,
    },
  }),
};

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [subject] = useQuery(space?.db, Filter.type(Organization.Organization));
  if (!subject) {
    return <Loading data={{ space: !!space, subject: !!subject }} />;
  }

  return (
    <Panel.Root>
      <Panel.Toolbar className='flex p-1 items-center'>
        <PromptList subject={subject} role='toolbar-input' />
      </Panel.Toolbar>
      <Panel.Content>
        <TracePanel space={space} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/containers/PromptList',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Prompt.Prompt, Organization.Organization, Markdown.Document],
          config: config.remote,
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              space.db.add(
                Organization.make({
                  name: 'DXOS',
                }),
              );
              space.db.add(
                Prompt.make({
                  name: 'Summarize',
                  instructions: 'Create a new markdown document that is a summary of the selected object.',
                }),
              );
              space.db.add(
                Prompt.make({
                  name: 'Analyze',
                  instructions: 'Analyze the selected content.',
                }),
              );
              space.db.add(
                Prompt.make({
                  name: 'Translate',
                  instructions: 'Translate the selected content to Spanish.',
                }),
              );
            }),
        }),

        AssistantPlugin(),
        AutomationPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
