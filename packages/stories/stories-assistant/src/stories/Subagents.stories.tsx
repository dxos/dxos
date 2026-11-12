//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as AssistantChat from '@dxos/assistant/Chat';
import type * as Reducer from '@dxos/compute/Reducer';
import * as Trajectory from '@dxos/compute/Trajectory';
import { type Database, Feed, Filter, Order, Query, Scope } from '@dxos/echo';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as Chat from '@dxos/plugin-assistant/Chat';
import * as ChatPlane from '@dxos/plugin-assistant/ChatPlane';
import * as AssistantHooks from '@dxos/plugin-assistant/Hooks';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { useObject, useQuery, useRegistry, useResolveRef, useSpaces } from '@dxos/react-client/echo';
import { Dnd } from '@dxos/react-ui-dnd';
import { Timeline } from '@dxos/react-ui-trace';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { StoryRole } from '../modules/index.ts';
import { toCommits } from '../modules/trajectory-commits.ts';
import { LAUNCH_REQUEST, LAUNCH_TASKS, PLANS, SAVINGS_PROMPTS, Scripts, SIDE_QUESTION } from '../scripts/index.ts';
import { CalculatorSkill, ModuleContainer, createDecorators, storyParameters, submitPrompt } from '../testing/index.ts';

/**
 * Subagents on light threads: the agent delegates self-contained tasks with `thread_delegate`; each runs in a
 * background thread of its own that starts with nothing but its task, shown as a card, and only its final answer joins
 * the conversation. The agent waits for the subagents with `thread_wait` while the reader keeps chatting. See
 * `packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl` (F-8).
 */
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Subagents',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

const decorators = createDecorators({
  skills: [CalculatorSkill.key],
  scriptedModels: { scenes: { savingsPlans: Scripts.savingsPlans }, select: 'savingsPlans' },
  assistantSettings: { parallelThreads: true },
});

/**
 * Scripted (offline): the agent delegates three plans to subagents, which run as background cards; a question sent
 * meanwhile answers at once; the comparison arrives when every subagent has reported.
 */
export const Scripted: Story = {
  decorators,
  args: {
    layout: [[StoryRole.Chat]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, SAVINGS_PROMPTS.compare);
    // Every subagent works in a card of its own.
    await waitFor(() => expect(canvas.getAllByTestId('chat.lane-card').length).toBeGreaterThanOrEqual(PLANS.length), {
      timeout: 30_000,
    });
    await submitPrompt(canvasElement, SAVINGS_PROMPTS.quick);
    await canvas.findAllByText(/17 × 23 = 391/, {}, { timeout: 30_000 });
    await canvas.findAllByText(/two extra points a year/, {}, { timeout: 120_000 });
  },
};

/** {@link Scripted} without its play function, for a recorded walkthrough that types the prompts itself. */
export const Demo: Story = {
  decorators,
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
  },
  tags: ['!test'],
};

//
// Columns: a complex request split into subagent threads, each in a column of its own.
//

type ChatModel = NonNullable<ReturnType<typeof AssistantHooks.useChatModel>>;

/** The chat model of the agent's conversation, or of one subagent thread when `lane` is given. */
const useThreadModel = (
  db: Database.Database | undefined,
  chat: AssistantChat.Chat | undefined,
  lane?: Trajectory.ThreadId,
) => {
  const registry = useRegistry();
  const runtime = Hooks.useProcessManagerRuntime();
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const { preset } = AssistantHooks.usePresets(settings, chat);
  return AssistantHooks.useChatModel({
    db,
    chat,
    preset,
    runtime,
    registry,
    settings,
    ...(lane ? { thread: lane } : {}),
  });
};

/** The events written in `lane` and in every turn or thread nested in it, in feed order. */
const laneEvents = (events: readonly Trajectory.Event[], lane: Trajectory.ThreadId): Trajectory.Event[] => {
  const threads = new Set<string>([lane]);
  return events.filter((event) => {
    const thread = Trajectory.threadOf(event);
    const payload = event.payload;
    if (
      thread !== undefined &&
      (payload._tag === 'turnBegin' || payload._tag === 'threadOpen') &&
      payload.from?.thread !== undefined &&
      threads.has(payload.from.thread)
    ) {
      threads.add(thread);
    }
    return thread !== undefined && threads.has(thread);
  });
};

/** The slice of the trajectory a subagent wrote, as a git graph: what it holds in memory, step by step. */
const LaneMemory = ({ events }: { events: readonly Trajectory.Event[] }) => {
  const commits = useMemo(() => toCommits(events), [events]);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  return (
    <div className='flex flex-col h-56 shrink-0 border-t border-separator' data-testid='launch.memory'>
      <div className='px-3 py-1 text-xs text-description'>Memory · {events.length} events</div>
      <ScrollArea.Root classNames='dx-grow'>
        <ScrollArea.Viewport ref={setViewport}>
          <Timeline commits={commits} scroller={viewport} />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};

type ThreadColumnProps = {
  db: Database.Database;
  chat: AssistantChat.Chat;
  lane: Reducer.Lane;
  events: readonly Trajectory.Event[];
};

/** One subagent thread: its reasoning and turns, the document it wrote as a card, and its slice of memory. */
const ThreadColumn = ({ db, chat, lane, events }: ThreadColumnProps) => {
  const chatModel = useThreadModel(db, chat, lane.id);
  const memory = useMemo(() => laneEvents(events, lane.id), [events, lane.id]);
  if (!chatModel) {
    return null;
  }

  return (
    <Chat.Root chat={chat} db={db} chatModel={chatModel}>
      <ChatPlane.Column value={lane.id}>
        <ChatPlane.Cell title={`${lane.purpose ?? 'Subagent'} · ${lane.status}`}>
          <Panel.Body asChild>
            <Chat.Content>
              <Chat.Thread viewType='thinking' />
            </Chat.Content>
          </Panel.Body>
          <LaneMemory events={memory} />
        </ChatPlane.Cell>
      </ChatPlane.Column>
    </Chat.Root>
  );
};

type AgentColumnProps = {
  db: Database.Database;
  chat: AssistantChat.Chat;
  chatModel: ChatModel;
};

/** The agent's own conversation, with the prompt and its checklist. */
/** The prompts the agent's column offers as chips, in the order the demo sends them. */
const SUGGESTIONS = [LAUNCH_REQUEST, SIDE_QUESTION];

const AgentColumn = ({ db, chat, chatModel }: AgentColumnProps) => {
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const { preset, ...chatProps } = AssistantHooks.usePresets(settings, chat);
  // One chip at a time: the side question only makes sense once the launch is under way.
  const [sent, setSent] = useState(0);
  const handleSelect = useCallback(() => setSent((count) => count + 1), []);
  return (
    <Chat.Root chat={chat} db={db} chatModel={chatModel}>
      <ChatPlane.Column value={chat.id}>
        <ChatPlane.Cell title='Agent'>
          <Panel.Body asChild>
            <Chat.Content>
              <Chat.Thread />
            </Chat.Content>
          </Panel.Body>
        </ChatPlane.Cell>
        <ChatPlane.Prompt>
          <Chat.Activity />
          <Chat.Suggestions suggestions={SUGGESTIONS.slice(sent, sent + 1)} onSelect={handleSelect} />
          <Chat.Prompt {...chatProps} outline preset={preset?.id} />
        </ChatPlane.Prompt>
      </ChatPlane.Column>
    </Chat.Root>
  );
};

/** How long a finished subagent's column stays open, so its result can be read before it closes. */
const CLOSE_DELAY = 6_000;

/**
 * The agent's conversation in the first column and each subagent thread in a column of its own: a column opens as the
 * agent delegates, and closes a few seconds after its subagent reports, leaving the result in the agent's column.
 */
const ThreadPlane = ({ db, chat, chatModel }: AgentColumnProps) => {
  const view = useAtomValue(chatModel.trajectory);
  const lanes = useMemo(() => view.lanes.filter((lane) => lane.kind === 'fresh'), [view.lanes]);
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const [current, setCurrent] = useState<string>();

  // Every branch of the feed, so each column can show the events its subagent wrote.
  const [feedRef] = useObject(chat, 'feed');
  const feed = useResolveRef(feedRef);
  const feedUri = feed && Feed.getFeedUri(feed);
  const query = useMemo(
    () =>
      feedUri
        ? Query.select(Filter.type(Trajectory.Event))
            .from(Scope.feed(feedUri.toString(), { walk: { branch: 'all' } }))
            .orderBy(Order.natural('asc'))
        : Query.select(Filter.nothing()),
    [feedUri?.toString()],
  );
  const events = useQuery(db, query);

  // Follows the newest thread as it opens, so the reader watches each column arrive.
  const countRef = useRef(0);
  useEffect(() => {
    if (lanes.length > countRef.current) {
      setCurrent(lanes[lanes.length - 1].id);
    }
    countRef.current = lanes.length;
  }, [lanes]);

  // A finished thread's column closes once the reader has had a moment with its result.
  const done = useMemo(
    () =>
      lanes
        .filter((lane) => lane.status === 'done' || lane.status === 'failed')
        .map(({ id }) => id)
        .join(','),
    [lanes],
  );
  useEffect(() => {
    const ids = done.split(',').filter((id) => id.length > 0 && !closed.has(id));
    if (ids.length === 0) {
      return;
    }
    const timer = setTimeout(() => setClosed((previous) => new Set([...previous, ...ids])), CLOSE_DELAY);
    return () => clearTimeout(timer);
  }, [done, closed]);

  const open = useMemo(() => lanes.filter(({ id }) => !closed.has(id)), [lanes, closed]);
  const items = useMemo(() => [{ id: chat.id }, ...open.map(({ id }) => ({ id }))], [chat, open]);
  const selected = current !== undefined && items.some(({ id }) => id === current) ? current : chat.id;

  return (
    <Dnd.Root>
      <ChatPlane.Root value={selected} onValueChange={setCurrent}>
        <ChatPlane.Viewport>
          <ChatPlane.Columns items={items}>
            {(id) => {
              if (id === chat.id) {
                return <AgentColumn db={db} chat={chat} chatModel={chatModel} />;
              }
              const lane = open.find((candidate) => candidate.id === id);
              return lane && <ThreadColumn db={db} chat={chat} lane={lane} events={events} />;
            }}
          </ChatPlane.Columns>
        </ChatPlane.Viewport>
      </ChatPlane.Root>
    </Dnd.Root>
  );
};

const ThreadColumns = () => {
  const [space] = useSpaces();
  const db = space?.db;
  const chats = useQuery(db, Filter.type(AssistantChat.Chat));
  const chat = chats.at(-1);
  const chatModel = useThreadModel(db, chat);
  if (!db || !chat || !chatModel) {
    return null;
  }

  return <ThreadPlane db={db} chat={chat} chatModel={chatModel} />;
};

/**
 * Scripted (offline): the reader asks for a launch kit; the agent puts four tasks on its checklist and delegates each
 * to a subagent, whose thread opens as a column showing its reasoning, the document it writes and its slice of memory.
 * The reader keeps talking meanwhile; each column closes once its subagent reports, and the result lands in the agent's
 * column.
 */
const columnsDecorators = createDecorators({
  skills: [MarkdownSkill.key, PlanningSkill.key],
  scriptedModels: { scenes: { launchKit: Scripts.launchKit }, select: 'launchKit' },
  assistantSettings: { parallelThreads: true, parallelThreadLimit: 6 },
});

/** Waits until exactly `count` subagent and agent columns are open. */
const waitForColumns = (canvasElement: HTMLElement, count: number, timeout: number) =>
  waitFor(() => expect(canvasElement.querySelectorAll('[data-testid="chat-plane.column"]').length).toBe(count), {
    timeout,
  });

export const Columns: StoryObj = {
  render: () => <ThreadColumns />,
  decorators: columnsDecorators,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: LAUNCH_REQUEST }, { timeout: 60_000 }));

    // A column per subagent opens beside the agent's.
    await waitForColumns(canvasElement, 1 + LAUNCH_TASKS.length, 60_000);

    // The reader keeps talking while they work; the reply comes once the agent's current wait returns.
    await userEvent.click(await canvas.findByRole('button', { name: SIDE_QUESTION }, { timeout: 30_000 }));
    await canvas.findAllByText(/Tuesday the 18th/, {}, { timeout: 90_000 });

    // Every subagent's column closes once it reports, and the summary lands in the agent's column with each document.
    await waitForColumns(canvasElement, 1, 120_000);
    await canvas.findAllByText(/The launch kit is ready/, {}, { timeout: 60_000 });
    for (const { document } of LAUNCH_TASKS) {
      await canvas.findAllByText(document, { exact: false });
    }
  },
};

/** {@link Columns} without its play function, for a recorded walkthrough that clicks the prompts itself. */
export const ColumnsDemo: StoryObj = {
  render: () => <ThreadColumns />,
  decorators: columnsDecorators,
  tags: ['!test'],
};
