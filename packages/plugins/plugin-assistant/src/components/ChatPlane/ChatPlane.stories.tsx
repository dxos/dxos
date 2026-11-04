//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { type AiService } from '@dxos/ai';
import { ScriptedLanguageModel, SERVICES_CONFIG } from '@dxos/ai/testing';
import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import { withPluginManager } from '@dxos/app-framework/testing';
import { TrajectoryStore } from '@dxos/assistant';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import * as AssistantChat from '@dxos/assistant/Chat';
import { Database, Feed, Filter, Ref, type Registry } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { Config } from '@dxos/react-client';
import { useRegistry, useSpaces } from '@dxos/react-client/echo';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Panel from '@dxos/react-ui/Panel';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Task } from '@dxos/types';

import { useChatModel, useChatServices, usePresets } from '#hooks';
import * as AssistantPlugin from '#meta';
import { translations } from '#translations';
import { type Assistant, AssistantCapabilities } from '#types';

import { AssistantNamespace } from '../../namespace.ts';
import { Chat } from '../Chat/index.ts';
import * as ChatPlane from './ChatPlane.tsx';

type StoryArgs = {
  /** Answers from a scripted model rather than the hosted service, so the story runs offline. */
  fake?: boolean;
  /** One exchange per thread to start with; without it the story starts with one empty thread. */
  seed?: readonly { prompt: string; reply: string }[];
  /** Position of the thread selected at the start. */
  selected?: number;
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

type ThreadColumnProps = {
  chat: AssistantChat.Chat;
  current: boolean;
  db: Database.Database;
  runtime?: Capabilities.ProcessManagerRuntime;
  registry: Registry.Registry;
  settings: Assistant.Settings;
};

/** One thread with its own chat model, so a turn keeps running after the reader moves to another thread. */
const ThreadColumn = ({ chat, current, db, runtime, registry, settings }: ThreadColumnProps) => {
  const { preset, ...chatProps } = usePresets(settings, chat);
  const chatModel = useChatModel({ db, chat, preset, runtime, registry, settings });
  // Sending before the new chat reaches the database would leave the agent unable to resolve it.
  const handleSubmit = useCallback(() => db.flush(), [db]);

  return (
    <Chat.Root chat={chat} db={db} chatModel={chatModel} onSubmit={handleSubmit}>
      <ChatPlane.Column value={chat.id}>
        <Panel.Body asChild>
          <Chat.Content>
            <Chat.Thread />
          </Chat.Content>
        </Panel.Body>
        <ChatPlane.Prompt>
          <Chat.Activity />
          <Chat.Prompt {...chatProps} outline autoFocus={current} preset={preset?.id} />
        </ChatPlane.Prompt>
      </ChatPlane.Column>
    </Chat.Root>
  );
};

const DefaultStory = ({ selected = 0 }: StoryArgs) => {
  const [space] = useSpaces();
  const db = space?.db;
  const chats = useQuery(db, Filter.type(AssistantChat.Chat));
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const registry = useRegistry();
  const runtime = useChatServices({ id: db?.spaceId });

  // Ids are time-ordered, so a thread lands at the end of the strip unless it was added on the left.
  const [prepended, setPrepended] = useState<readonly string[]>([]);
  const threads = useMemo(() => {
    const sorted = chats.toSorted((a, b) => a.id.localeCompare(b.id));
    const isPrepended = ({ id }: AssistantChat.Chat) => prepended.includes(id);
    return [...sorted.filter(isPrepended).toReversed(), ...sorted.filter((chat) => !isPrepended(chat))];
  }, [chats, prepended]);
  const [currentId, setCurrentId] = useState<string>();
  // A thread just created is not in the query yet, so an unknown id holds the position until it arrives.
  const lastIndexRef = useRef(selected);
  const found = threads.findIndex(({ id }) => id === currentId);
  const index = found === -1 ? Math.max(Math.min(lastIndexRef.current, threads.length - 1), 0) : found;
  // Only a thread that was found moves the position: threads arrive in stages, and clamping to the first of them
  // would lose the one selected at the start.
  if (found !== -1) {
    lastIndexRef.current = found;
  }
  const current = threads[index];

  const handleNew = useCallback(
    (side: 'start' | 'end' = 'end') => {
      if (db) {
        const feed = db.add(Feed.make());
        const chat = db.add(AssistantChat.make({ name: `Thread ${threads.length + 1}`, feed: Ref.make(feed) }));
        if (side === 'start') {
          setPrepended((ids) => [...ids, chat.id]);
        }
        setCurrentId(chat.id);
      }
    },
    [db, threads.length],
  );

  const previous = threads[index - 1];
  const next = threads[index + 1];
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: 'Threads' })
        .action(
          'new',
          {
            label: ['new-thread.button', { ns: AssistantNamespace.key }],
            icon: 'ph--plus--regular',
            testId: 'chat-plane.new',
          },
          () => handleNew(),
        )
        .action(
          'previous',
          {
            label: 'Previous thread',
            icon: 'ph--caret-left--regular',
            disabled: !previous,
            testId: 'chat-plane.previous',
          },
          () => previous && setCurrentId(previous.id),
        )
        .action(
          'next',
          {
            label: 'Next thread',
            icon: 'ph--caret-right--regular',
            disabled: !next,
            testId: 'chat-plane.next',
          },
          () => next && setCurrentId(next.id),
        )
        .build(),
    [handleNew, previous?.id, next?.id],
  );

  if (!db || !current) {
    return <Loading />;
  }

  return (
    <ChatPlane.Root value={current.id} onValueChange={setCurrentId} onAdd={handleNew}>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={current.id} alwaysActive />
      </Panel.Header>
      <ChatPlane.Viewport>
        <ChatPlane.Add side='start' />
        <ChatPlane.Columns>
          {threads.map((chat) => (
            <ThreadColumn
              key={chat.id}
              chat={chat}
              current={chat.id === current.id}
              db={db}
              runtime={runtime}
              registry={registry}
              settings={settings}
            />
          ))}
        </ChatPlane.Columns>
        <ChatPlane.Add side='end' />
      </ChatPlane.Viewport>
    </ChatPlane.Root>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatPlane',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(({ args: { fake, seed } }) => ({
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
              const exchanges = seed ?? [undefined];
              for (const [index, exchange] of exchanges.entries()) {
                const feed = space.db.add(Feed.make());
                space.db.add(AssistantChat.make({ name: `Thread ${index + 1}`, feed: Ref.make(feed) }));
                if (exchange) {
                  yield* TrajectoryStore.appendExchange(feed, exchange).pipe(Effect.provide(Database.layer(space.db)));
                }
              }
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

/** Starts on the second of four threads that already hold a conversation; replies come from the scripted model. */
export const FourThreads: Story = {
  args: {
    fake: true,
    selected: 1,
    seed: [
      { prompt: 'What is the capital of Australia?', reply: 'Canberra.' },
      { prompt: 'What is 17 × 23?', reply: 'The answer is 391.' },
      { prompt: 'Name a prime number above 100.', reply: 'For example, 101.' },
      { prompt: 'How many sides does a hexagon have?', reply: 'Six.' },
    ],
  },
};
