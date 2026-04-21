//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Plan, Agent } from '@dxos/assistant-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Organization } from '@dxos/types';

import { AssistantPlugin } from '../../AssistantPlugin';
import { translations } from '../../translations';
import { AgentProperties } from './AgentProperties';

type DefaultStoryProps = {};

const DefaultStory = (_: DefaultStoryProps) => {
  const [space] = useSpaces();
  const [agent] = useQuery(space?.db, Filter.type(Agent.Agent));
  if (!agent) {
    return <Loading />;
  }

  return (
    <ObjectProperties object={agent}>
      <AgentProperties role='object-properties' subject={agent} />
    </ObjectProperties>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/containers/AgentProperties',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Agent.Agent, Plan.Plan, Text.Text, Organization.Organization],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              const organization = space.db.add(
                Obj.make(Organization.Organization, {
                  name: 'Acme Corp',
                  description: 'Sample organization for the story.',
                }),
              );

              space.db.add(
                Obj.make(Agent.Agent, {
                  spec: Ref.make(Text.make('Initiative spec for the story.')),
                  plan: Ref.make(Plan.makePlan({ tasks: [] })),
                  artifacts: [{ name: 'Organization', data: Ref.make(organization) }],
                  subscriptions: [],
                }),
              );
            }),
        }),
        StorybookPlugin({}),
        AutomationPlugin(),
        AssistantPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<DefaultStoryProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
