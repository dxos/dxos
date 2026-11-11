//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as AssistantChat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import type * as Reducer from '@dxos/compute/Reducer';
import type * as Trajectory from '@dxos/compute/Trajectory';
import { type Database, Filter } from '@dxos/echo';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as Chat from '@dxos/plugin-assistant/Chat';
import * as ChatPlane from '@dxos/plugin-assistant/ChatPlane';
import * as AssistantHooks from '@dxos/plugin-assistant/Hooks';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { useQuery, useRegistry, useSpaces } from '@dxos/react-client/echo';
import { Dnd } from '@dxos/react-ui-dnd';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Panel from '@dxos/react-ui/Panel';

import { StoryRole } from '../modules/index.ts';
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
// Columns: the same delegation, with each subagent thread in a column of its own.
//

/** A task the reader hands the agent; each becomes a subagent thread that writes one document. */
type LaunchTask = {
  readonly purpose: string;
  readonly task: string;
  readonly document: string;
  readonly outline: string;
  readonly content: string;
  /** Seconds each of the subagent's turns takes, so the threads finish at different times. */
  readonly pace: number;
};

const LAUNCH_TASKS: readonly LaunchTask[] = [
  {
    purpose: 'Blog post',
    task: 'Draft the launch blog post for Composer 1.0: what it is, who it is for, and the three features to try first.',
    document: 'Launch blog post',
    outline: 'I will lead with the problem, then walk through the three features with one example each.',
    content: [
      '# Composer 1.0',
      '',
      'Your documents, tables and agents in one local-first workspace.',
      '',
      '## Three things to try first',
      '',
      '1. **Spaces** that sync between your devices and your team.',
      '2. **Agents** that work on the same objects you do.',
      '3. **Plugins** that turn a space into a tool for your job.',
    ].join('\n'),
    pace: 3,
  },
  {
    purpose: 'Release notes',
    task: 'Write the release notes for Composer 1.0, grouped into new features, improvements and fixes.',
    document: 'Release notes 1.0',
    outline: 'I will group the changes into three sections and keep each line to one change.',
    content: [
      '# Release notes · 1.0',
      '',
      '## New',
      '- Parallel agent threads, each in a column of its own.',
      '',
      '## Improved',
      '- Spaces open twice as fast.',
      '',
      '## Fixed',
      '- Comments keep their position after an edit.',
    ].join('\n'),
    pace: 4,
  },
  {
    purpose: 'FAQ',
    task: 'Draft an FAQ for the launch page that answers the five questions new users ask most.',
    document: 'Launch FAQ',
    outline: 'I will answer each question in two sentences at most, starting with where data lives.',
    content: [
      '# FAQ',
      '',
      '**Where is my data?** On your devices first; it syncs through EDGE when you share.',
      '',
      '**Does it work offline?** Yes. Changes merge when you reconnect.',
      '',
      '**Can agents see everything?** Only the spaces you give them.',
    ].join('\n'),
    pace: 5,
  },
  {
    purpose: 'Announcement email',
    task: 'Write the announcement email to existing users, under 150 words, with one call to action.',
    document: 'Announcement email',
    outline: 'I will keep it short: one paragraph on what is new and one link to try it.',
    content: [
      '# Composer 1.0 is here',
      '',
      'Hi there,',
      '',
      'Composer 1.0 lets agents work beside you, each on its own task, in the same space.',
      '',
      '**[Open Composer](https://composer.space)** and try it on your next project.',
    ].join('\n'),
    pace: 3.5,
  },
];

const LAUNCH_PROMPT = [
  'Here are the launch tasks. Delegate each one to a subagent, then tell me when they are all done.',
  '',
  ...LAUNCH_TASKS.map(({ purpose, task }) => `- **${purpose}:** ${task}`),
].join('\n');

const CREATE_DOCUMENT = Operation.toolName(MarkdownOperation.Create);

/** The thread a launch task's subagent was started in, from the delegating call's result. */
const startedLaunchThread = (prompt: string, task: LaunchTask) =>
  new RegExp(`Started subagent thread ([\\w@-]+) \\(\\\\*"${task.purpose}`).exec(prompt)?.[1];

/** The URI of the document the subagent created, from the create tool's result. */
const createdDocument = (prompt: string) => /(echo:\/\/[^"\\\s]+|dxn:echo:[^"\\\s]+)/.exec(prompt)?.[1];

/** A subagent plans, writes its document, then reports with the document embedded as a card. */
const launchSubagent = (
  request: ScriptedLanguageModel.ScriptedRequest,
  task: LaunchTask,
  step: number,
): ScriptedLanguageModel.ScriptedTurn => {
  switch (step) {
    case 0:
      return {
        delay: `${task.pace} seconds`,
        parts: [
          reasoning(`The task: ${task.task}`),
          text(task.outline),
          toolCall(CREATE_DOCUMENT, { name: task.document, content: task.content }),
        ],
      };
    default: {
      const uri = createdDocument(JSON.stringify(request.prompt.content.slice(currentRequest(request).index + 1)));
      return {
        delay: `${task.pace / 2} seconds`,
        parts: [text([`Wrote **${task.document}**.`, '', ...(uri ? [`![${task.document}](${uri})`] : [])].join('\n'))],
      };
    }
  }
};

/** The agent delegates one task per turn, so the columns open one by one, then waits for every subagent. */
const launchScript: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  if (!request.tools.includes(CREATE_DOCUMENT)) {
    return { parts: [text('Launch plan')] };
  }
  const { text: current, index } = currentRequest(request);
  const task = LAUNCH_TASKS.find((candidate) => current === candidate.task);
  if (task !== undefined) {
    return launchSubagent(request, task, toolResultsSince(request, index));
  }
  if (!current.includes('launch tasks')) {
    return { parts: [text('Done.')] };
  }
  const prompt = JSON.stringify(request.prompt.content);
  const threads = LAUNCH_TASKS.map((candidate) => startedLaunchThread(prompt, candidate));
  const next = threads.findIndex((thread) => thread === undefined);
  if (next !== -1) {
    const nextTask = LAUNCH_TASKS[next];
    return {
      delay: '1500 millis',
      parts: [
        ...(next === 0 ? [reasoning('The tasks are independent, so each can run in a subagent of its own.')] : []),
        text(`Delegating the ${nextTask.purpose.toLowerCase()}.`),
        toolCall('thread_delegate', { task: nextTask.task, purpose: nextTask.purpose }),
      ],
    };
  }
  const pending = LAUNCH_TASKS.findIndex((candidate) => !prompt.includes(`Wrote **${candidate.document}**`));
  if (pending !== -1) {
    return {
      delay: '500 millis',
      parts: [toolCall('thread_wait', { thread: threads[pending] })],
    };
  }
  return {
    delay: '1200 millis',
    parts: [
      text(
        [
          'All four launch tasks are done:',
          '',
          ...LAUNCH_TASKS.map(({ purpose, document }) => `- **${purpose}:** ${document}`),
        ].join('\n'),
      ),
    ],
  };
};

const STATUS_ICON: Record<Reducer.LaneStatus | 'todo', string> = {
  todo: 'ph--circle--regular',
  running: 'ph--circle-notch--regular',
  waiting: 'ph--hourglass--regular',
  done: 'ph--check-circle--regular',
  failed: 'ph--x-circle--regular',
};

/** The reader's task list: what the agent was given, and where each task's thread stands. */
const TaskList = ({
  lanes,
  started,
  onStart,
  onSelect,
}: {
  lanes: readonly Reducer.Lane[];
  started: boolean;
  onStart: () => void;
  onSelect: (id: string) => void;
}) => (
  <Panel.Root classNames='w-72 shrink-0 border-e border-separator' data-testid='launch.tasks'>
    <Panel.Header classNames='px-3 font-medium'>Launch tasks</Panel.Header>
    <Panel.Body classNames='flex flex-col gap-1 p-2 overflow-y-auto'>
      {LAUNCH_TASKS.map((task) => {
        const lane = lanes.find((candidate) => candidate.purpose === task.purpose);
        const status = lane?.status ?? 'todo';
        return (
          <button
            key={task.purpose}
            type='button'
            disabled={!lane}
            className='flex gap-2 p-2 rounded-sm text-start hover:bg-hover-surface disabled:hover:bg-transparent'
            data-testid='launch.task'
            data-status={status}
            onClick={() => lane && onSelect(lane.id)}
          >
            <Icon.Icon
              icon={STATUS_ICON[status]}
              size='md'
              classNames={[status === 'running' && 'animate-spin', status === 'done' && 'text-success-text']}
            />
            <span className='flex flex-col min-w-0'>
              <span className='text-sm font-medium'>{task.purpose}</span>
              <span className='text-xs text-description line-clamp-2'>{task.task}</span>
            </span>
          </button>
        );
      })}
    </Panel.Body>
    <Panel.Footer classNames='p-2'>
      <Button.Root
        classNames='w-full'
        variant='primary'
        icon='ph--play--regular'
        label='Delegate'
        disabled={started}
        data-testid='launch.start'
        onClick={onStart}
      />
    </Panel.Footer>
  </Panel.Root>
);

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
  const { preset, ...chatProps } = AssistantHooks.usePresets(settings, chat);
  const chatModel = AssistantHooks.useChatModel({
    db,
    chat,
    preset,
    runtime,
    registry,
    settings,
    ...(lane ? { thread: lane } : {}),
  });
  return { chatModel, preset, chatProps };
};

type ThreadColumnProps = {
  db: Database.Database;
  chat: AssistantChat.Chat;
  lane: Reducer.Lane;
};

/** One subagent thread: its conversation, with the documents it wrote as cards. */
const ThreadColumn = ({ db, chat, lane }: ThreadColumnProps) => {
  const { chatModel } = useThreadModel(db, chat, lane.id);
  if (!chatModel) {
    return null;
  }
  return (
    <Chat.Root chat={chat} db={db} chatModel={chatModel}>
      <ChatPlane.Column value={lane.id}>
        <ChatPlane.Cell title={`${lane.purpose ?? 'Subagent'} · ${lane.status}`}>
          <Panel.Body asChild>
            <Chat.Content>
              <Chat.Thread />
            </Chat.Content>
          </Panel.Body>
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

/** The agent's own conversation, with the prompt. */
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

/**
 * The agent's conversation in the first column and each subagent thread in a column of its own, opened as the agent
 * delegates; the task list on the left starts the run and follows each task's thread.
 */
const ThreadPlane = ({ db, chat, chatModel }: AgentColumnProps) => {
  const view = useAtomValue(chatModel.trajectory);
  const lanes = useMemo(() => view.lanes.filter((lane) => lane.kind === 'fresh'), [view.lanes]);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState<string>();

  // Follows the newest thread as it opens, so the reader watches each column arrive.
  const countRef = useRef(0);
  useEffect(() => {
    if (lanes.length > countRef.current) {
      setCurrent(lanes[lanes.length - 1].id);
    }
    countRef.current = lanes.length;
  }, [lanes]);

  const handleStart = useCallback(() => {
    setStarted(true);
    void chatModel.request({ message: LAUNCH_PROMPT });
  }, [chatModel]);

  const items = useMemo(() => [{ id: chat.id }, ...lanes.map(({ id }) => ({ id }))], [chat, lanes]);

  return (
    <div className='flex grow h-full min-w-0'>
      <TaskList lanes={lanes} started={started} onStart={handleStart} onSelect={setCurrent} />
      <div className='flex-1 min-w-0'>
        <Dnd.Root>
          <ChatPlane.Root value={current ?? chat.id} onValueChange={setCurrent}>
            <ChatPlane.Viewport>
              <ChatPlane.Columns items={items}>
                {(id) => {
                  if (id === chat.id) {
                    return <AgentColumn db={db} chat={chat} chatModel={chatModel} />;
                  }
                  const lane = lanes.find((candidate) => candidate.id === id);
                  return lane && <ThreadColumn db={db} chat={chat} lane={lane} />;
                }}
              </ChatPlane.Columns>
            </ChatPlane.Viewport>
          </ChatPlane.Root>
        </Dnd.Root>
      </div>
    </div>
  );
};

const ThreadColumns = () => {
  const [space] = useSpaces();
  const db = space?.db;
  const chats = useQuery(db, Filter.type(AssistantChat.Chat));
  const chat = chats.at(-1);
  const { chatModel } = useThreadModel(db, chat);
  if (!db || !chat || !chatModel) {
    return null;
  }

  return <ThreadPlane db={db} chat={chat} chatModel={chatModel} />;
};

/**
 * Scripted (offline): the reader hands the agent four launch tasks; it delegates them one by one, and each subagent
 * thread opens as a column of its own, holding its conversation and the document it wrote.
 */
export const Columns: StoryObj = {
  render: () => <ThreadColumns />,
  decorators: createDecorators({
    skills: [MarkdownSkill.key],
    scripted: launchScript,
    assistantSettings: { parallelThreads: true, parallelThreadLimit: 6 },
  }),
  tags: ['!test'],
};
