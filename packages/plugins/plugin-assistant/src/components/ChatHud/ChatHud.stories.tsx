//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type AiService } from '@dxos/ai';
import { ScriptedLanguageModel, SERVICES_CONFIG } from '@dxos/ai/testing';
import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import * as AssistantChat from '@dxos/assistant/Chat';
import { type Database, Feed, Filter, Ref, type Registry } from '@dxos/echo';
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
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Task } from '@dxos/types';

import { useChatModel, useChatServices, usePresets } from '#hooks';
import * as AssistantPlugin from '#meta';
import { translations } from '#translations';
import { type Assistant, AssistantCapabilities } from '#types';

import { AssistantNamespace } from '../../namespace.ts';
import { Chat, useChatContext } from '../Chat/index.ts';

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

type ThreadColumnProps = {
  chat: AssistantChat.Chat;
  db: Database.Database;
  runtime?: Capabilities.ProcessManagerRuntime;
  registry: Registry.Registry;
  settings: Assistant.Settings;
  current: boolean;
  /** The footer the current thread's prompt renders into. */
  footer: HTMLElement | null;
  onSelect: (chat: AssistantChat.Chat) => void;
};

/**
 * One thread with its own chat model, so a turn keeps running after the reader moves to another thread.
 *
 * Every thread keeps its prompt mounted in the footer, hidden unless current, so a draft survives moving away.
 */
const ThreadColumn = ({ chat, db, runtime, registry, settings, current, footer, onSelect }: ThreadColumnProps) => {
  const { preset, ...chatProps } = usePresets(settings, chat);
  const chatModel = useChatModel({ db, chat, preset, runtime, registry, settings });
  // Sending before the new chat reaches the database would leave the agent unable to resolve it.
  const handleSubmit = useCallback(() => db.flush(), [db]);

  const columnRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (current) {
      columnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [current]);

  return (
    <Chat.Root chat={chat} db={db} chatModel={chatModel} onSubmit={handleSubmit}>
      <Panel.Root classNames='w-[min(32rem,100cqw)] snap-start border-e border-separator' asChild>
        <div
          data-testid='chat-hud.thread'
          aria-current={current ? 'true' : undefined}
          onClick={() => onSelect(chat)}
          ref={columnRef}
        >
          <Panel.Header classNames={['px-2 py-1 truncate', current ? 'bg-attention-surface' : 'text-fg-subtle']}>
            {chat.name}
          </Panel.Header>
          <Panel.Body asChild>
            <Chat.Content>
              <Chat.Thread />
            </Chat.Content>
          </Panel.Body>
        </div>
      </Panel.Root>
      {footer &&
        createPortal(
          <div className={current ? 'flex flex-col gap-1 w-full max-w-[40rem] mx-auto p-1' : 'hidden'}>
            <Chat.Activity />
            <Chat.Prompt {...chatProps} outline autoFocus={current} preset={preset?.id} />
            <ThreadPromptFocus current={current} />
          </div>,
          footer,
        )}
    </Chat.Root>
  );
};

/** Moving to a thread puts the cursor in its prompt, since typing is what the footer is for. */
const ThreadPromptFocus = ({ current }: { current: boolean }) => {
  const { event } = useChatContext('ThreadPromptFocus');
  useEffect(() => {
    if (current) {
      event.emit({ type: 'focus-prompt' });
    }
  }, [event, current]);
  return null;
};

const DefaultStory = () => {
  const [space] = useSpaces();
  const db = space?.db;
  const chats = useQuery(db, Filter.type(AssistantChat.Chat));
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const registry = useRegistry();
  const runtime = useChatServices({ id: db?.spaceId });
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);

  // Ids are time-ordered, so a new thread lands at the end of the strip.
  const threads = useMemo(() => chats.toSorted((a, b) => a.id.localeCompare(b.id)), [chats]);
  const [currentId, setCurrentId] = useState<string>();
  const index = Math.max(
    threads.findIndex(({ id }) => id === currentId),
    0,
  );
  const current = threads[index];

  const handleNew = useCallback(() => {
    if (db) {
      const feed = db.add(Feed.make());
      const chat = db.add(AssistantChat.make({ name: `Thread ${threads.length + 1}`, feed: Ref.make(feed) }));
      setCurrentId(chat.id);
    }
  }, [db, threads.length]);

  const handleSelect = useCallback((chat: AssistantChat.Chat) => setCurrentId(chat.id), []);

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
            testId: 'chat-hud.new',
          },
          handleNew,
        )
        .action(
          'previous',
          {
            label: 'Previous thread',
            icon: 'ph--caret-left--regular',
            disabled: !previous,
            testId: 'chat-hud.previous',
          },
          () => previous && setCurrentId(previous.id),
        )
        .action(
          'next',
          {
            label: 'Next thread',
            icon: 'ph--caret-right--regular',
            disabled: !next,
            testId: 'chat-hud.next',
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
    <Panel.Root>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={current.id} alwaysActive />
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='horizontal' snap>
          <ScrollArea.Viewport>
            <div className='flex w-max h-full'>
              {threads.map((chat) => (
                <ThreadColumn
                  key={chat.id}
                  chat={chat}
                  db={db}
                  runtime={runtime}
                  registry={registry}
                  settings={settings}
                  current={chat.id === current.id}
                  footer={footer}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
      <Panel.Footer ref={setFooter} />
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatHud',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
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
              space.db.add(AssistantChat.make({ name: 'Thread 1', feed: Ref.make(feed) }));
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
