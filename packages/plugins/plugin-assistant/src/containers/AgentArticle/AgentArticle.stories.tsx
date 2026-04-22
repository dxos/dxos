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
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { Message, Organization, Person } from '@dxos/types';

import { createMessage } from '#testing';

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
    withTheme(),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Agent.Agent, Message.Message, Plan.Plan, Text.Text, Organization.Organization, Person.Person],
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

              const inputQueue = space.queues.create();
              yield* Effect.promise(() =>
                inputQueue.append([
                  createMessage('user', [{ _tag: 'text', text: 'Summarize the current artifacts.' }]),
                  createMessage('assistant', [
                    { _tag: 'text', text: 'Here is a quick overview of the organizations and contacts in context.' },
                  ]),
                  createMessage('user', [{ _tag: 'text', text: 'Flag anything that needs follow-up.' }]),
                ]),
              );

              space.db.add(
                Obj.make(Agent.Agent, {
                  instructions: Ref.make(Text.make()),
                  plan: Ref.make(Plan.makePlan({ tasks: [] })),
                  artifacts: created.map((obj) => ({
                    name: Obj.getLabel(obj) ?? 'Artifact',
                    data: Ref.make(obj),
                  })),
                  queue: Ref.fromDXN(inputQueue.dxn),
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
