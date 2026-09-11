//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useContext, useEffect } from 'react';
import { expect, within } from 'storybook/test';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useAtomCapability } from '@dxos/app-framework/ui';
import { Alarm, SessionStore } from '@dxos/assistant';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import * as ChatType from '@dxos/assistant/Chat';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { Config } from '@dxos/react-client';
import { useRegistry, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Task } from '@dxos/types';

import { useChatProcessor, useChatServices, usePresets } from '#hooks';
import { AssistantPlugin } from '#plugin';
import { translations } from '#translations';
import { AssistantCapabilities } from '#types';

import { Chat } from '../Chat/index.ts';

type StoryArgs = {
  /** Seed the chat's checklist, so the tasks toggle has something to show. */
  tasks?: { title: string; status?: Task.Task['status'] }[];
  tasksVisible?: boolean;
  /** Prompts already queued on the feed, as a submit-while-busy leaves them. */
  queued?: string[];
  /**
   * Holds the processor `active` while leaving `streaming` false — a turn parked in a tool call.
   * This is the state the send/stop control has to get right, and no scripted model can hold it
   * still long enough to assert against.
   */
  running?: boolean;
  /** Minutes from now to seed a pending alarm on the feed, which the status pill reports. */
  alarmInMinutes?: number;
};

const DefaultStory = ({ tasksVisible: initialTasksVisible, running }: StoryArgs) => {
  const [space] = useSpaces();
  const [chat] = useQuery(space?.db, Filter.type(ChatType.Chat));
  const settings = useAtomCapability(AssistantCapabilities.Settings);
  const registry = useRegistry();
  const { preset, ...chatProps } = usePresets(settings);
  const db = space?.db;
  const runtime = useChatServices({ id: db?.spaceId });
  const processor = useChatProcessor({ db, chat, preset, runtime, registry, settings });

  // Drives the control's mode from the outside, so the assertion does not race a real turn. The
  // processor reads its atoms from the ambient registry, which is what the story writes to.
  // The same registry `useChatProcessor` hands the processor, so a write here is a write it sees.
  const atomRegistry = useContext(RegistryContext);
  useEffect(() => {
    if (running && processor) {
      atomRegistry.set(processor.active, true);
    }
  }, [running, processor, atomRegistry]);

  if (!chat || !db || !processor) {
    return <Loading />;
  }

  return (
    <div className='flex justify-center p-4'>
      <div className='w-full max-w-document-width'>
        <Chat.Root chat={chat} db={db} processor={processor}>
          {/* Mounted here as every prompt host must: queued prompts are held out of the thread, so
              without this part they are submitted and then invisible. */}
          <Chat.Status classNames='px-3 rounded-sm bg-group-surface' />
          <Chat.Queue classNames='pb-1' />
          {/* `attendableId` is the graph node contributed actions are filed under; the story's chat
              has no node, so the row shows only its own controls unless a plugin renders one. The
              checklist is the prompt's own disclosed region now, not a sibling the story places. */}
          <Chat.Prompt {...chatProps} outline preset={preset?.id} defaultTasksVisible={initialTasksVisible} />
        </Chat.Root>
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatPrompt',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column', classNames: 'flex flex-col justify-end w-[30rem]' }),
    withPluginManager<StoryArgs>(({ args: { tasks = [], queued = [], alarmInMinutes } }) => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [ChatType.Chat, Feed.Feed, Message.Message, Task.Task, Alarm.Alarm],
          config: new Config({ runtime: { services: SERVICES_CONFIG.REMOTE } }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              const feed = space.db.add(Feed.make());
              const chat = space.db.add(ChatType.make({ name: 'Test', feed: Ref.make(feed) }));
              for (const { title, status } of tasks) {
                ChatType.addTask(space.db, chat, title, { status });
              }
              // Queued input is feed state, so seeding it is exactly what a submit-while-busy does.
              const store = new SessionStore();
              for (const text of queued) {
                yield* store
                  .enqueueMessage(feed, Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text }] }))
                  .pipe(Effect.provide(Database.layer(space.db)));
              }
              if (alarmInMinutes !== undefined) {
                yield* store
                  .setAlarm(feed, { wakeAt: Date.now() + alarmInMinutes * 60_000, message: 'Check the build' })
                  .pipe(Effect.provide(Database.layer(space.db)));
              }
              // The task list reads its rows through resolve-once ref atoms; load them so the story
              // renders without waiting on a lazy resolution nothing triggers.
              yield* Effect.promise(() => Promise.all(chat.tasks.map((task: Ref.Ref<Task.Task>) => task.load())));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        AssistantPlugin({}),
        StorybookPlugin.make({}),
      ],
      capabilities,
    })),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {},
};

export const WithTasks: Story = {
  args: {
    tasksVisible: true,
    tasks: [
      { title: 'Gather the requirements', status: 'done' },
      { title: 'Draft the plan', status: 'started' },
      { title: 'Verify and ship', status: 'todo' },
    ],
  },
};

/** Prompts waiting on the agent, stacked above the composer. */
export const Queued: Story = {
  args: {
    queued: ['Summarize the meeting notes', 'Then draft a follow-up email to the team'],
  },
};

export const TestQueued: Story = {
  args: {
    queued: ['Waiting on the agent'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Generous: the story boots a client and a space before anything renders.
    const items = await canvas.findAllByTestId('assistant.queued-message', {}, { timeout: 30_000 });
    await expect(items).toHaveLength(1);
    await expect(items[0]).toHaveTextContent('Waiting on the agent');
  },
};

/** A pending alarm, reported by the status pill beside the token counts. */
export const PendingAlarm: Story = {
  args: { alarmInMinutes: 30 },
};

/**
 * The alarm reaching the pill through the real stack: an `Alarm` record on the feed, the reactive
 * query over it, `projectAlarms`, the chat context, then the pill. `ChatStatus.stories.tsx` covers
 * the rendering; this is the wiring, which is the half that can silently return nothing.
 */
export const TestAlarmFromFeed: Story = {
  args: { alarmInMinutes: 30 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Generous: the story boots a client and a space, then the query has to emit.
    await canvas.findByTestId('assistant.chat-status.alarm', {}, { timeout: 30_000 });
  },
};

/**
 * A running turn with an empty composer: the primary control is Stop. Keyed to `active` rather than
 * `streaming`, so a turn parked in a tool call (streaming nothing) is still interruptible.
 */
export const TestStopWhileRunning: Story = {
  args: { running: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const control = await canvas.findByTestId('assistant.send', {}, { timeout: 30_000 });
    await expect(control).toHaveAccessibleName('Stop processing');
    await expect(control).toBeEnabled();
  },
};

/** The same running turn, with text waiting: the control offers Send, which queues it behind the turn. */
export const TestSendWhileRunning: Story = {
  args: { running: true },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const control = await canvas.findByTestId('assistant.send', {}, { timeout: 30_000 });
    await expect(control).toHaveAccessibleName('Stop processing');

    // Typing flips the same control from Stop to Send while the turn keeps running.
    const editor = canvasElement.querySelector<HTMLElement>('[role="group"] .cm-content');
    await expect(editor).not.toBeNull();
    await userEvent.click(editor!);
    await userEvent.type(editor!, 'queue this');

    await expect(canvas.getByTestId('assistant.send')).toHaveAccessibleName('Send');
    await expect(canvas.getByTestId('assistant.send')).toBeEnabled();
  },
};

/**
 * The row's own controls, with nothing contributed to it. The microphone is deliberately absent:
 * it is not the prompt's, it is filed on the chat's graph node by plugin-transcription.
 */
export const TestBareRow: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Generous: the story boots a client and a space before the prompt exists at all.
    await canvas.findByTestId('assistant.send', {}, { timeout: 30_000 });
    await expect(canvas.queryByTestId('transcription.record')).toBeNull();
  },
};
