//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import React, { useState } from 'react';

import { SessionConfig } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import * as Chat from '@dxos/assistant/Chat';
import { Feed, Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ChessPlugin } from '@dxos/plugin-chess/testing';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { MapPlugin } from '@dxos/plugin-map/testing';
import { TablePlugin } from '@dxos/plugin-table/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { useRegistry, useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Organization, Person } from '@dxos/types';

import { useContextBinder } from '#hooks';
import { translations } from '#translations';
import { type Assistant, AssistantCapabilities } from '#types';

import { ChatOptions, type ChatOptionsProps, ObjectsPanel } from './ChatOptions.tsx';

/** Stands in for an agent another plugin registers: listed in the picker, never run by the story. */
const stubAgent = (
  id: string,
  label: string,
  availability: AssistantCapabilities.AgentAvailability,
): AssistantCapabilities.Agent => ({
  id,
  label,
  icon: id === SessionConfig.COMPOSER_HARNESS ? 'ph--sparkle--regular' : 'px--anthropic--regular',
  availability: Atom.make(availability).pipe(Atom.keepAlive),
  makeTurnProducer: () => Effect.succeed({ runTurn: () => Effect.succeed([]), getSkills: () => [] }),
});

const presets = [
  {
    id: 'edge-claude-sonnet',
    label: 'Edge/Claude Sonnet',
  },
  {
    id: 'edge-gpt-4o',
    label: 'Edge/GPT-4o',
  },
  {
    id: 'ollama-llama3',
    label: 'Ollama/Llama 3',
  },
];

type StoryArgs = Pick<ChatOptionsProps, 'presets' | 'started'>;

const DefaultStory = ({ presets, started }: StoryArgs) => {
  const [space] = useSpaces();
  const [feed] = useQuery(space?.db, Filter.type(Feed.Feed));
  const [chat] = useQuery(space?.db, Filter.type(Chat.Chat));
  const registry = useRegistry();
  const binder = useContextBinder(space, feed);
  const [preset, setPreset] = useState(presets?.[0]?.id);
  if (!space || !binder || !chat) {
    return <Loading />;
  }

  return (
    <ChatOptions
      chat={chat}
      db={space.db}
      context={binder}
      registry={registry}
      started={started}
      presets={presets}
      preset={preset}
      onPresetChange={setPreset}
    />
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatOptions',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [Chat.Chat, Feed.Feed, Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              // Populate space with sample objects.
              for (let idx = 0; idx < 8; idx++) {
                space.db.add(Organization.make({ name: `Org ${idx + 1}` }));
                space.db.add(Person.make({ fullName: `Person ${idx + 1}` }));
              }

              // Create the chat feed used by the context binder.
              const feed = space.db.add(Feed.make());
              space.db.add(Chat.make({ name: 'Test chat', feed: Ref.make(feed) }));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        ChessPlugin(),
        MapPlugin(),
        TablePlugin(),
      ],
      capabilities: [
        ...capabilities,
        // The Models tab's online switch reads the assistant settings; without them it would suspend forever.
        Capability.contribute(AssistantCapabilities.Settings, Atom.make<Assistant.Settings>({}).pipe(Atom.keepAlive)),
        Capability.contribute(
          AssistantCapabilities.Agent,
          stubAgent(SessionConfig.COMPOSER_HARNESS, 'Composer', { available: true }),
        ),
        Capability.contribute(
          AssistantCapabilities.Agent,
          stubAgent('claude-code', 'Claude Code', { available: false, reason: 'needs the Composer desktop app' }),
        ),
        Capability.contribute(
          AssistantCapabilities.Agent,
          stubAgent('claude-code-edge', 'Claude Code (cloud)', { available: true }),
        ),
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

export const Default: Story = {
  args: {
    presets,
  },
};

/** A chat that has begun shows its agent but no longer offers the others. */
export const Started: Story = {
  args: {
    presets,
    started: true,
  },
};

export const _ObjectsPanel: Story = {
  render: () => {
    const [space] = useSpaces();
    const [feed] = useQuery(space?.db, Filter.type(Feed.Feed));
    const binder = useContextBinder(space, feed);
    if (!space || !binder) {
      return <Loading />;
    }

    return (
      <div className='border border-separator'>
        <ObjectsPanel db={space.db} context={binder} />
      </div>
    );
  },
};
