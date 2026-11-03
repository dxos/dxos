//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React from 'react';

import { type AiService } from '@dxos/ai';
import { ScriptedLanguageModel, SERVICES_CONFIG } from '@dxos/ai/testing';
import * as Hooks from '@dxos/app-framework/Hooks';
import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import * as AssistantChat from '@dxos/assistant/Chat';
import { Feed, Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { Config } from '@dxos/react-client';
import { useRegistry, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Task } from '@dxos/types';

import { useChatModel, useChatServices, usePresets } from '#hooks';
import * as AssistantPlugin from '#meta';
import { translations } from '#translations';
import { AssistantCapabilities } from '#types';

import { Chat } from '../Chat/index.ts';

type StoryArgs = {
  /** Answers from a scripted model rather than the hosted service, so the story runs offline. */
  fake?: boolean;
};

/**
 * Replaces the AI service with a model that answers every turn, however many are sent.
 *
 * The model is built once: `languageModel()` runs per request, and a model built there would restart its script.
 */
const fakeAiServiceMiddleware = () => {
  const model = Effect.runSync(
    ScriptedLanguageModel.makeScriptedLanguageModel((_request, index) => ({
      parts: [ScriptedLanguageModel.text(`Fake reply ${index + 1}.`)],
      delay: '1 second',
    })),
  );
  const layer = Layer.succeed(LanguageModel.LanguageModel, model);
  return (upstream: AiService.Service): AiService.Service => ({ ...upstream, languageModel: () => layer });
};

const DefaultStory = () => {
  const [space] = useSpaces();
  const db = space?.db;
  const [chat] = useQuery(db, Filter.type(AssistantChat.Chat));
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const registry = useRegistry();
  const { preset, ...chatProps } = usePresets(settings, chat);
  const runtime = useChatServices({ id: db?.spaceId });
  const chatModel = useChatModel({ db, chat, preset, runtime, registry, settings });

  if (!chat || !db || !chatModel) {
    return <Loading />;
  }

  return (
    <Chat.Root chat={chat} db={db} chatModel={chatModel}>
      <Chat.Prompt {...chatProps} outline preset={preset?.id} />
    </Chat.Root>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatHud',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'centered', classNames: 'w-full max-w-[40rem]' }),
    withPluginManager<StoryArgs>(({ args: { fake } }) => ({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [AssistantChat.Chat, Feed.Feed, Message.Message, Task.Task],
          config: new Config({ runtime: { services: SERVICES_CONFIG.REMOTE } }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              const feed = space.db.add(Feed.make());
              space.db.add(AssistantChat.make({ name: 'Test', feed: Ref.make(feed) }));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        AssistantPlugin.make({ aiServiceMiddleware: fake ? fakeAiServiceMiddleware() : undefined }),
        RoutinePlugin.make(),
        // Provides the space services a turn runs with; without it every request fails on `Registry.Service`.
        SpacePlugin.make({}),
        StorybookPlugin.make({}),
      ],
      capabilities,
    })),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

/** Talks to the hosted AI service. */
export const RealModel: Story = {
  args: {},
};

/** Talks to a scripted model: offline, and every reply is predictable. */
export const FakeModel: Story = {
  args: { fake: true },
};
