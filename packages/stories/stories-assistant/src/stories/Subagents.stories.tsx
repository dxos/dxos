//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as AssistantChat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import type * as Reducer from '@dxos/compute/Reducer';
import * as Trajectory from '@dxos/compute/Trajectory';
import { type Database, Feed, Filter, Obj, Order, Query, Scope } from '@dxos/echo';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as Chat from '@dxos/plugin-assistant/Chat';
import * as ChatPlane from '@dxos/plugin-assistant/ChatPlane';
import * as AssistantHooks from '@dxos/plugin-assistant/Hooks';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { useObject, useQuery, useRegistry, useResolveRef, useSpaces } from '@dxos/react-client/echo';
import { Dnd } from '@dxos/react-ui-dnd';
import { Timeline } from '@dxos/react-ui-trace';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { StoryRole } from '../modules/index.ts';
import { toCommits } from '../modules/trajectory-commits.ts';
import {
  Calculate,
  CalculatorSkill,
  ModuleContainer,
  createDecorators,
  storyParameters,
  submitPrompt,
} from '../testing/index.ts';

const { text, reasoning, toolCall } = ScriptedLanguageModel;

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

/** The prompts the demo sends, in order. */
const PROMPTS = {
  compare: 'Compare three savings plans for $10,000 at 4%, 6% and 8% a year over 30 years.',
  quick: 'Meanwhile, what is 17 × 23?',
} as const;

const CALCULATE = Operation.toolName(Calculate);

type Plan = { readonly name: string; readonly rate: number; readonly values: readonly string[] };

/** Each plan's balance after 10, 20 and 30 years, as the calculator returns them. */
const PLANS: readonly Plan[] = [
  { name: 'Plan A', rate: 4, values: ['14,802.44', '21,911.23', '32,433.98'] },
  { name: 'Plan B', rate: 6, values: ['17,908.48', '32,071.35', '57,434.91'] },
  { name: 'Plan C', rate: 8, values: ['21,589.25', '46,609.57', '100,626.57'] },
];

const YEARS = [10, 20, 30] as const;

const purposeOf = (plan: Plan) => `${plan.name} · ${plan.rate}%`;

const taskOf = (plan: Plan) =>
  `Compute the balance of $10,000 saved at ${plan.rate}% a year, compounded yearly, after 10, 20 and 30 years.`;

/** A status line the runtime appends about other threads; never the request itself. */
const isStatusLine = (value: string) => /^Thread \S+ .* is (running|done)/.test(value);

/** The text parts of a message, in order. */
const textParts = (content: ScriptedLanguageModel.ScriptedRequest['prompt']['content'][number]): string[] =>
  typeof content.content === 'string'
    ? [content.content]
    : content.content.flatMap((part) => (part.type === 'text' ? [part.text] : []));

/** The request a call answers: the last text of the last user message that is not a thread status line or snapshot. */
const currentRequest = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): { text: string; index: number } => {
  for (let index = prompt.content.length - 1; index >= 0; index--) {
    const message = prompt.content[index];
    if (message.role !== 'user') {
      continue;
    }
    const request = textParts(message)
      .filter((part) => !isStatusLine(part) && !part.includes('<thread '))
      .at(-1);
    if (request !== undefined) {
      return { text: request, index };
    }
  }
  return { text: '', index: -1 };
};

/** Tool results since the request: how far through its loop the call is. */
const toolResultsSince = ({ prompt }: ScriptedLanguageModel.ScriptedRequest, index: number) =>
  prompt.content.slice(index + 1).filter((message) => message.role === 'tool').length;

/** The thread a subagent was started in, from the delegating call's result (quotes escaped in the prompt's JSON). */
const startedThread = (prompt: string, plan: Plan) =>
  new RegExp(`Started subagent thread ([\\w@-]+) \\(\\\\*"${purposeOf(plan)}`).exec(prompt)?.[1];

/** A subagent computes its plan one calculator call at a time, then reports. */
const subagent = (plan: Plan, step: number): ScriptedLanguageModel.ScriptedTurn => {
  if (step < YEARS.length) {
    const years = YEARS[step];
    return {
      delay: `${4 + plan.rate / 2} seconds`,
      parts: [
        reasoning(`Balance after ${years} years at ${plan.rate}%.`),
        text(`After ${years} years…`),
        toolCall(CALCULATE, { expression: `10000*(1+${plan.rate}/100)^${years}` }),
      ],
    };
  }
  return {
    delay: '600 millis',
    parts: [
      text(
        `At ${plan.rate}%, $10,000 grows to $${plan.values[0]} after 10 years, $${plan.values[1]} after 20 and ` +
          `$${plan.values[2]} after 30.`,
      ),
    ],
  };
};

/**
 * The agent hands each plan to a subagent, then waits for them one by one and compares their answers; a question sent
 * meanwhile is answered at once in a light thread.
 */
const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  // Side calls (chat naming) offer no tools.
  if (!request.tools.includes(CALCULATE)) {
    return { parts: [text('Savings plans')] };
  }
  const { text: current, index } = currentRequest(request);
  const step = toolResultsSince(request, index);
  const plan = PLANS.find((candidate) => current === taskOf(candidate));
  if (plan !== undefined) {
    return subagent(plan, step);
  }
  if (current.includes('17 × 23')) {
    return { delay: '900 millis', parts: [text('17 × 23 = 391.')] };
  }
  if (current.includes('savings plans')) {
    const prompt = JSON.stringify(request.prompt.content);
    const threads = PLANS.map((candidate) => startedThread(prompt, candidate));
    if (threads.some((thread) => thread === undefined)) {
      return {
        delay: '1200 millis',
        parts: [
          reasoning('Each plan is independent, so each can be worked out by a subagent in parallel.'),
          text('I will hand each plan to a subagent and compare their results.'),
          ...PLANS.map((candidate) =>
            toolCall('thread_delegate', { task: taskOf(candidate), purpose: purposeOf(candidate) }),
          ),
        ],
      };
    }
    const pending = PLANS.findIndex((candidate) => !prompt.includes(`$${candidate.values[2]} after 30`));
    if (pending !== -1) {
      return {
        delay: '500 millis',
        parts: [text(`Waiting for ${PLANS[pending].name}.`), toolCall('thread_wait', { thread: threads[pending] })],
      };
    }
    return {
      delay: '1500 millis',
      parts: [
        text(
          [
            'After 30 years, $10,000 grows to:',
            '',
            '| Plan | Rate | 10 years | 20 years | 30 years |',
            '| --- | --- | --- | --- | --- |',
            ...PLANS.map(
              (candidate) =>
                `| ${candidate.name} | ${candidate.rate}% | $${candidate.values[0]} | $${candidate.values[1]} | ` +
                `$${candidate.values[2]} |`,
            ),
            '',
            'Plan C ends with about three times what Plan A does: two extra points a year compound into a large gap.',
          ].join('\n'),
        ),
      ],
    };
  }
  return { parts: [text('Done.')] };
};

const decorators = createDecorators({
  skills: [CalculatorSkill.key],
  scripted: script,
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
    await submitPrompt(canvasElement, PROMPTS.compare);
    // Every subagent works in a card of its own.
    await waitFor(() => expect(canvas.getAllByTestId('chat.lane-card').length).toBeGreaterThanOrEqual(PLANS.length), {
      timeout: 30_000,
    });
    await submitPrompt(canvasElement, PROMPTS.quick);
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

/** One part of the launch; the agent puts it on its checklist and hands it to a subagent that writes one document. */
type LaunchTask = {
  readonly title: string;
  readonly task: string;
  readonly document: string;
  readonly brief: string;
  readonly outline: string;
  readonly body: string;
  readonly review: string;
  /** Seconds each of the subagent's turns takes, so the threads finish at different times. */
  readonly pace: number;
};

const LAUNCH_TASKS: readonly LaunchTask[] = [
  {
    title: 'Blog post',
    task: 'Draft the launch blog post for Composer 1.0: what it is, who it is for, and the three features to try first.',
    document: 'Launch blog post',
    brief: 'Readers are new to Composer. Lead with the problem it solves before naming any feature.',
    outline: ['# Composer 1.0', '', '## Why', '', '## Three things to try first', ''].join('\n'),
    body: [
      'Your documents, tables and agents in one local-first workspace.',
      '',
      '1. **Spaces** that sync between your devices and your team.',
      '2. **Agents** that work on the same objects you do.',
      '3. **Plugins** that turn a space into a tool for your job.',
    ].join('\n'),
    review: 'Three features, one example each, under 300 words. Good to hand back.',
    pace: 5,
  },
  {
    title: 'Release notes',
    task: 'Write the release notes for Composer 1.0, grouped into new features, improvements and fixes.',
    document: 'Release notes 1.0',
    brief: 'Release notes are scanned, not read: one change per line, grouped so each reader finds their part.',
    outline: ['# Release notes · 1.0', '', '## New', '## Improved', '## Fixed', ''].join('\n'),
    body: [
      '- New: parallel agent threads, each in a column of its own.',
      '- Improved: spaces open twice as fast.',
      '- Fixed: comments keep their position after an edit.',
    ].join('\n'),
    review: 'Every line is one change and starts with its group. Done.',
    pace: 6,
  },
  {
    title: 'FAQ',
    task: 'Draft an FAQ for the launch page that answers the questions new users ask most.',
    document: 'Launch FAQ',
    brief: 'The first question is always where the data lives, so that one goes first.',
    outline: ['# FAQ', ''].join('\n'),
    body: [
      '**Where is my data?** On your devices first; it syncs through EDGE when you share.',
      '',
      '**Does it work offline?** Yes. Changes merge when you reconnect.',
      '',
      '**Can agents see everything?** Only the spaces you give them.',
    ].join('\n'),
    review: 'Each answer is two sentences at most. The privacy answer is first, as planned.',
    pace: 7,
  },
  {
    title: 'Announcement email',
    task: 'Write the announcement email to existing users, under 150 words, with one call to action.',
    document: 'Announcement email',
    brief: 'Existing users already know Composer; tell them what changed and give them one link.',
    outline: ['# Composer 1.0 is here', '', 'Hi there,', ''].join('\n'),
    body: [
      'Composer 1.0 lets agents work beside you, each on its own task, in the same space.',
      '',
      '**[Open Composer](https://composer.space)** and try it on your next project.',
    ].join('\n'),
    review: 'Under 150 words with a single link. Ready.',
    pace: 5.5,
  },
];

/** What the reader types: one request too large for a single thread. */
const LAUNCH_REQUEST =
  'Plan the Composer 1.0 launch: we need a blog post, release notes, an FAQ and an announcement email.';

/** Sent while the subagents work, to show the agent keeps talking. */
const SIDE_QUESTION = 'While they work: which day should we launch?';

const CREATE_DOCUMENT = Operation.toolName(MarkdownOperation.Create);
const UPDATE_DOCUMENT = Operation.toolName(MarkdownOperation.Update);
const CHECKPOINT_DOCUMENT = Operation.toolName(MarkdownOperation.CreateCheckpoint);
const UPDATE_TASKS = Operation.toolName(PlanningSkill.Operations.UpdateTasks);

/** The agent's chat, read at turn time: the checklist names tasks by URI, which exists only once a task is created. */
let launchChat: AssistantChat.Chat | undefined;

/** The URI of the checklist task titled `title`, as the update-tasks tool takes it. */
const taskUri = (title: string): string | undefined => {
  const task = launchChat && AssistantChat.resolveTasks(launchChat).find((candidate) => candidate.title === title);
  return task && Obj.getURI(task).toString();
};

/** The thread a launch task's subagent was started in, from the delegating call's result. */
const startedLaunchThread = (prompt: string, task: LaunchTask) =>
  new RegExp(`Started subagent thread ([\\w@-]+) \\(\\\\*"${task.title}`).exec(prompt)?.[1];

/** The URI of the document the subagent created, from the create tool's result. */
const createdDocument = (prompt: string) => /(echo:\/\/[^"\\\s]+|dxn:echo:[^"\\\s]+)/.exec(prompt)?.[1];

/** A subagent thinks aloud at every step: it outlines, fills in, checks its work, then reports with the document. */
const launchSubagent = (
  request: ScriptedLanguageModel.ScriptedRequest,
  task: LaunchTask,
  step: number,
): ScriptedLanguageModel.ScriptedTurn => {
  const uri = createdDocument(JSON.stringify(request.prompt.content.slice(currentRequest(request).index + 1)));
  switch (step) {
    case 0:
      return {
        delay: `${task.pace} seconds`,
        parts: [
          reasoning(task.brief),
          text('Outline first, so the structure is settled before any wording.'),
          toolCall(CREATE_DOCUMENT, { name: task.document, content: task.outline }),
        ],
      };
    case 1:
      return {
        delay: `${task.pace} seconds`,
        parts: [
          reasoning('The outline holds. Each section needs one concrete line, nothing more.'),
          text('Filling in the sections.'),
          toolCall(UPDATE_DOCUMENT, { doc: uri, edits: [{ newString: `\n${task.body}\n` }] }),
        ],
      };
    case 2:
      return {
        delay: `${task.pace / 2} seconds`,
        parts: [
          reasoning(task.review),
          text('Saving a checkpoint for review.'),
          toolCall(CHECKPOINT_DOCUMENT, { doc: uri, name: 'Ready for review' }),
        ],
      };
    default:
      return {
        delay: '600 millis',
        parts: [text([`Wrote **${task.document}**.`, '', ...(uri ? [`![${task.document}](${uri})`] : [])].join('\n'))],
      };
  }
};

/**
 * The agent puts the work on its checklist, delegates one task per turn so the columns open one by one, then waits for
 * each subagent, checking its task off as it reports.
 */
const launchScript: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  if (request.text.includes('Reply with exactly one word')) {
    return { parts: [text('stop')] };
  }
  if (!request.tools.includes(CREATE_DOCUMENT)) {
    return { parts: [text('Composer 1.0 launch')] };
  }
  const { text: current, index } = currentRequest(request);
  const task = LAUNCH_TASKS.find((candidate) => current === candidate.task);
  if (task !== undefined) {
    return launchSubagent(request, task, toolResultsSince(request, index));
  }
  if (current.includes('which day')) {
    return {
      delay: '1200 millis',
      parts: [
        text(
          'Tuesday the 18th: midweek launches get the most attention, and it leaves Monday for a last check of the documents.',
        ),
      ],
    };
  }
  if (!current.includes('Composer 1.0 launch')) {
    return { parts: [text('Done.')] };
  }

  const prompt = JSON.stringify(request.prompt.content);
  if (LAUNCH_TASKS.some(({ title }) => taskUri(title) === undefined)) {
    return {
      delay: '1500 millis',
      parts: [
        reasoning('Four documents with no dependencies between them: each can go to a subagent of its own.'),
        text('I will split this into four tasks and hand each one to a subagent.'),
        toolCall(UPDATE_TASKS, { changes: LAUNCH_TASKS.map(({ title }) => ({ create: true, title })) }),
      ],
    };
  }
  const threads = LAUNCH_TASKS.map((candidate) => startedLaunchThread(prompt, candidate));
  const next = threads.findIndex((thread) => thread === undefined);
  if (next !== -1) {
    const nextTask = LAUNCH_TASKS[next];
    return {
      delay: '1200 millis',
      parts: [
        text(`Delegating the ${nextTask.title.toLowerCase()}.`),
        toolCall(UPDATE_TASKS, { changes: [{ task: taskUri(nextTask.title), status: 'started' }] }),
        toolCall('thread_delegate', { task: nextTask.task, purpose: nextTask.title }),
      ],
    };
  }
  // Check off every task whose subagent has reported, then wait for the next one still working.
  const reported = LAUNCH_TASKS.filter(({ document }) => prompt.includes(`Wrote **${document}**`));
  const unchecked = reported.filter(({ title }) => {
    const task = launchChat && AssistantChat.resolveTasks(launchChat).find((candidate) => candidate.title === title);
    return task?.status !== 'done';
  });
  const checkOff = unchecked.length
    ? [toolCall(UPDATE_TASKS, { changes: unchecked.map(({ title }) => ({ task: taskUri(title), status: 'done' })) })]
    : [];
  const pending = LAUNCH_TASKS.findIndex((candidate) => !reported.includes(candidate));
  if (pending !== -1) {
    return { delay: '500 millis', parts: [...checkOff, toolCall('thread_wait', { thread: threads[pending] })] };
  }
  if (checkOff.length > 0) {
    return { delay: '500 millis', parts: [text('Every subagent has reported.'), ...checkOff] };
  }
  return {
    delay: '1200 millis',
    parts: [
      text(
        [
          'The launch kit is ready:',
          '',
          ...LAUNCH_TASKS.map(({ title, document }) => `- **${title}:** ${document}`),
          '',
          'Each document has a checkpoint named "Ready for review", so you can compare any later edit against it.',
        ].join('\n'),
      ),
    ],
  };
};

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
const AgentColumn = ({ db, chat, chatModel }: AgentColumnProps) => {
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const { preset, ...chatProps } = AssistantHooks.usePresets(settings, chat);
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
  launchChat = chat;
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
export const Columns: StoryObj = {
  render: () => <ThreadColumns />,
  decorators: createDecorators({
    skills: [MarkdownSkill.key, PlanningSkill.key],
    scripted: launchScript,
    assistantSettings: { parallelThreads: true, parallelThreadLimit: 6 },
  }),
  tags: ['!test'],
};
