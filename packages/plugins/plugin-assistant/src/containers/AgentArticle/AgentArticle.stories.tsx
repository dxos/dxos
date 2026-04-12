//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Plan, Agent } from '@dxos/assistant-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { translations } from '../../translations';
import { AgentArticle } from './AgentArticle';

random.seed(1);

type DefaultStoryProps = {};

const DefaultStory = (_: DefaultStoryProps) => {
  const [space] = useSpaces();
  const [agent] = useQuery(space?.db, Filter.type(Agent.Agent));
  if (!agent) {
    return <Loading />;
  }

  return <AgentArticle role='article' subject={agent} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-assistant/containers/AgentArticle',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Agent.Agent, Plan.Plan, Text.Text, Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              const factory = createObjectFactory(space.db, random as any);
              const created = yield* Effect.promise(() =>
                factory([
                  { type: Organization.Organization, count: 10 },
                  { type: Person.Person, count: 10 },
                ]),
              );
              const artifacts = created.map((obj) => ({
                name: Obj.getLabel(obj) ?? 'Artifact',
                data: Ref.make(obj),
              }));

              space.db.add(
                Obj.make(Agent.Agent, {
                  spec: Ref.make(Text.make('Initiative spec for the story.')),
                  plan: Ref.make(Plan.makePlan({ tasks: [] })),
                  artifacts,
                  subscriptions: [],
                }),
              );
            }),
        }),
        StorybookPlugin({}),
        PreviewPlugin(),
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
