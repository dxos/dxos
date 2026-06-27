//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Agent, Plan } from '@dxos/assistant-toolkit';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { createObjectFactory, TypeSpec } from '@dxos/schema/testing';
import { Message, Organization, Person } from '@dxos/types';

import { createMessage } from '#testing';
import { translations } from '#translations';

import { AssistantPlugin } from '../../AssistantPlugin';
import { AgentArticle } from './AgentArticle';

random.seed(1);

type StoryArgs = {
  inputs?: boolean;
};

// Hoisted out of `args` because Storybook's CSF arg traversal walks every value
// and tries to mutate `.id` on each entry — which throws on ECHO `Type.Type`
// entities (Type.makeObject returns an immutable proxy). Keeping the spec here
// dodges the traversal entirely.
const defaultSpec: TypeSpec[] = [
  { type: Organization.Organization, count: 10 },
  { type: Person.Person, count: 10 },
];

const DefaultStory = (_: StoryArgs) => {
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
    withPluginManager<StoryArgs>(({ args: { inputs } }) => ({
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
              const artifacts = yield* Effect.promise(() => factory(defaultSpec));

              const inputFeed = space.db.add(Feed.make({}));
              if (inputs) {
                yield* Effect.promise(() =>
                  space.db.appendToFeed(inputFeed, [
                    createMessage('user', [{ _tag: 'text', text: 'Summarize the current artifacts.' }]),
                    createMessage('assistant', [
                      { _tag: 'text', text: 'Here is a quick overview of the organizations and contacts in context.' },
                    ]),
                    createMessage('user', [{ _tag: 'text', text: 'Flag anything that needs follow-up.' }]),
                  ]),
                );
              }

              space.db.add(
                Obj.make(Agent.Agent, {
                  instructions: Ref.make(Text.make()),
                  artifacts: artifacts.map((obj) => ({
                    name: Obj.getLabel(obj) ?? 'Artifact',
                    data: Ref.make(obj),
                  })),
                  feed: Ref.make(inputFeed),
                  subscriptions: [],
                }),
              );
            }),
        }),
        RoutinePlugin(),
        AssistantPlugin(),
        PreviewPlugin(),
        StorybookPlugin({}),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    inputs: true,
  },
};

export const Empty: Story = {};
