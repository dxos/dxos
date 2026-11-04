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
import * as Button from '@dxos/react-ui/Button';
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

/** Sets the width shared by the threads and the prompt. */
const CHAT_HUD_WIDTH = '[--chat-hud-width:32vw]';

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
      columnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [current]);

  return (
    <Chat.Root chat={chat} db={db} chatModel={chatModel} onSubmit={handleSubmit}>
      <Panel.Root classNames='w-(--chat-hud-width) snap-center' asChild>
        <div
          data-testid='chat-hud.thread'
          data-thread-id={chat.id}
          aria-current={current ? 'true' : undefined}
          onClick={() => onSelect(chat)}
          ref={columnRef}
        >
          <Panel.Body asChild>
            <Chat.Content>
              <Chat.Thread />
            </Chat.Content>
          </Panel.Body>
        </div>
      </Panel.Root>
      {footer &&
        createPortal(
          <div className={current ? 'flex flex-col gap-1 w-(--chat-hud-width) mx-auto pointer-events-auto' : 'hidden'}>
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

type AddThreadProps = {
  side: 'start' | 'end';
  onAdd: (side: 'start' | 'end') => void;
};

/** Overflows a zero-width box into the strip's padding, since any width here would make a lone thread scroll. */
const AddThread = ({ side, onAdd }: AddThreadProps) => (
  <div className={['flex items-center w-0', side === 'start' && 'justify-end'].filter(Boolean).join(' ')}>
    <Button.Root
      classNames={[
        'shrink-0 opacity-10 transition-opacity hover:opacity-100 focus-visible:opacity-100',
        side === 'start' ? 'me-2' : 'ms-2',
      ]}
      icon='ph--plus--regular'
      iconOnly
      showTooltip={false}
      size='xl'
      iconSize='xl'
      label={side === 'start' ? 'Add thread on the left' : 'Add thread on the right'}
      variant='ghost'
      data-testid={`chat-hud.add-${side}`}
      onClick={() => onAdd(side)}
    />
  </div>
);

const DefaultStory = () => {
  const [space] = useSpaces();
  const db = space?.db;
  const chats = useQuery(db, Filter.type(AssistantChat.Chat));
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const registry = useRegistry();
  const runtime = useChatServices({ id: db?.spaceId });
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);

  // The prompt floats over the strip and grows with its text, so the threads track its height to end above it.
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!footer) {
      return;
    }
    const observer = new ResizeObserver(() => {
      stripRef.current?.style.setProperty('--chat-hud-footer-height', `${footer.offsetHeight}px`);
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [footer]);

  // Ids are time-ordered, so a thread lands at the end of the strip unless it was added on the left.
  const [prepended, setPrepended] = useState<readonly string[]>([]);
  const threads = useMemo(() => {
    const sorted = chats.toSorted((a, b) => a.id.localeCompare(b.id));
    const isPrepended = ({ id }: AssistantChat.Chat) => prepended.includes(id);
    return [...sorted.filter(isPrepended).toReversed(), ...sorted.filter((chat) => !isPrepended(chat))];
  }, [chats, prepended]);
  const [currentId, setCurrentId] = useState<string>();
  // A thread just created is not in the query yet, so an unknown id holds the position until it arrives.
  const lastIndexRef = useRef(0);
  const found = threads.findIndex(({ id }) => id === currentId);
  const index = found === -1 ? Math.max(Math.min(lastIndexRef.current, threads.length - 1), 0) : found;
  lastIndexRef.current = index;
  const current = threads[index];

  // Where a move we started is headed: adding a thread re-snaps the strip, and that scroll must not select anything.
  const moveTargetRef = useRef<string | undefined>(undefined);
  const moveTo = useCallback((id: string) => {
    moveTargetRef.current = id;
    setCurrentId(id);
  }, []);

  // On `scrollend` rather than `scroll`: selecting mid-flight would re-center on every thread a long scroll passes.
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!viewport) {
      return;
    }
    const handleScrollEnd = () => {
      const { left, width } = viewport.getBoundingClientRect();
      const center = left + width / 2;
      const distanceFromCenter = (column: HTMLElement) => {
        const rect = column.getBoundingClientRect();
        return Math.abs(rect.left + rect.width / 2 - center);
      };
      const columns = Array.from(stripRef.current?.querySelectorAll<HTMLElement>('[data-thread-id]') ?? []);
      const [nearest] = columns.toSorted((a, b) => distanceFromCenter(a) - distanceFromCenter(b));
      const id = nearest?.dataset.threadId;
      if (moveTargetRef.current) {
        if (id === moveTargetRef.current) {
          moveTargetRef.current = undefined;
        }
      } else if (id) {
        setCurrentId(id);
      }
    };
    // The reader taking over abandons any move in flight.
    const handleTakeOver = () => {
      moveTargetRef.current = undefined;
    };
    const frame = viewport.parentElement;
    frame?.addEventListener('wheel', handleTakeOver, { passive: true });
    frame?.addEventListener('pointerdown', handleTakeOver);
    viewport.addEventListener('scrollend', handleScrollEnd);
    return () => {
      viewport.removeEventListener('scrollend', handleScrollEnd);
      frame?.removeEventListener('wheel', handleTakeOver);
      frame?.removeEventListener('pointerdown', handleTakeOver);
    };
  }, [viewport]);

  const handleNew = useCallback(
    (side: 'start' | 'end' = 'end') => {
      if (db) {
        const feed = db.add(Feed.make());
        const chat = db.add(AssistantChat.make({ name: `Thread ${threads.length + 1}`, feed: Ref.make(feed) }));
        if (side === 'start') {
          setPrepended((ids) => [...ids, chat.id]);
        }
        moveTo(chat.id);
      }
    },
    [db, threads.length, moveTo],
  );

  // Selecting the current thread moves nothing, so no `scrollend` would ever clear the target.
  const currentThreadId = current?.id;
  const handleSelect = useCallback(
    (chat: AssistantChat.Chat) => {
      if (chat.id !== currentThreadId) {
        moveTo(chat.id);
      }
    },
    [currentThreadId, moveTo],
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
            testId: 'chat-hud.new',
          },
          () => handleNew(),
        )
        .action(
          'previous',
          {
            label: 'Previous thread',
            icon: 'ph--caret-left--regular',
            disabled: !previous,
            testId: 'chat-hud.previous',
          },
          () => previous && moveTo(previous.id),
        )
        .action(
          'next',
          {
            label: 'Next thread',
            icon: 'ph--caret-right--regular',
            disabled: !next,
            testId: 'chat-hud.next',
          },
          () => next && moveTo(next.id),
        )
        .build(),
    [handleNew, moveTo, previous?.id, next?.id],
  );

  if (!db || !current) {
    return <Loading />;
  }

  return (
    <Panel.Root classNames={CHAT_HUD_WIDTH}>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={current.id} alwaysActive />
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='horizontal' snap>
          <ScrollArea.Viewport ref={setViewport}>
            {/* Half the frame less half a thread each side, so even the first and last thread can reach the center. */}
            <div
              className='flex w-max h-full px-[calc(50cqw-var(--chat-hud-width)/2)] pb-(--chat-hud-footer-height)'
              ref={stripRef}
            >
              <AddThread side='start' onAdd={handleNew} />
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
              <AddThread side='end' onAdd={handleNew} />
            </div>
          </ScrollArea.Viewport>
          {/* The gap below the prompt leaves the scrollbar visible at the bottom of the page. */}
          <div className='absolute inset-x-0 bottom-0 z-10 py-3 pointer-events-none' ref={setFooter} />
        </ScrollArea.Root>
      </Panel.Body>
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
