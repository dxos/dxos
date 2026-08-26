//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AppSurface } from '@dxos/app-toolkit/ui';
import {
  DelegationOperations,
  DelegationSkill,
  PlanningOperations,
  PlanningSkill,
  WebSearchSkill,
} from '@dxos/assistant-toolkit';
import { Chat as AssistantChat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Obj, Ref } from '@dxos/echo';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { type Space } from '@dxos/react-client/echo';
import { Outline, type Task, TaskSet } from '@dxos/types';

import { StoryRole } from '../modules';
import { Calculate, CalculatorSkill, ModuleContainer, config, createDecorators, storyParameters } from '../testing';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Chat',
  render: ModuleContainer,
  parameters: storyParameters,
};

const { text, toolCall, promptIncludes } = ScriptedLanguageModel;

/** Shared by the delegation script and its assertions. */
const TASK_TITLE = 'Compute 10 factorial';

// Captured by `onInit` so play functions can assert on the real objects the skills write, rather
// than on rendered text, which would race the agent's writes.
let storySpace: Space | undefined;

const captureSpace = async ({ space }: { space: Space }) => {
  storySpace = space;
  // Stories run sequentially in one module: a set seeded by an earlier story must not leak into
  // the next story's assertions.
  storyTaskSet = undefined;
};

// Captured by `seedExecutableTasks`, so assertions read the seeded set directly rather than
// through the index (which may not have caught up with objects seeded during plugin activation).
let storyTaskSet: TaskSet.TaskSet | undefined;

/** The conversation's working tasks — the seeded set when present, else the first queried one. */
const readChecklist = async (): Promise<Outline.ChecklistItem[]> => {
  let taskSet = storyTaskSet;
  if (!taskSet) {
    if (!storySpace) {
      return [];
    }
    [taskSet] = await storySpace.db.query(Filter.type(TaskSet.TaskSet)).run();
  }
  if (!taskSet) {
    return [];
  }
  const tasks = await Promise.all(taskSet.tasks.map((ref) => ref.load()));
  return tasks.map((task) => ({ title: task.title, done: task.status === 'done' }));
};

/** Polls the checklist until `predicate` holds, so assertions do not race the agent's writes. */
const waitForChecklist = async (
  predicate: (items: Outline.ChecklistItem[]) => boolean,
  { timeout = 60_000 }: { timeout?: number } = {},
): Promise<Outline.ChecklistItem[]> => {
  const deadline = Date.now() + timeout;
  let items: Outline.ChecklistItem[] = [];
  while (Date.now() < deadline) {
    items = await readChecklist();
    if (predicate(items)) {
      return items;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Checklist never satisfied the condition; last saw: ${JSON.stringify(items)}`);
};

/** Types a prompt into the chat editor and submits it. */
const submitPrompt = async (canvasElement: HTMLElement, text: string) => {
  const canvas = within(canvasElement);
  const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 30_000 });
  const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
  if (!editor) {
    throw new Error('Chat editor not found.');
  }

  await userEvent.click(editor);
  await userEvent.type(editor, text);
  await userEvent.keyboard('{Enter}');
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const MarkdownPlugin = await import('@dxos/plugin-markdown/MarkdownPlugin');
      return {
        plugins: [MarkdownPlugin.make()],
      };
    },
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Logging, StoryRole.Config]],
  },
};

//
// Executable tasks — seeds the delegation/execution demos. B depends on A and C on B, so a drain
// must run in dependency order; every title routes the work through the story-local calculator.
//

const EXECUTABLE_TASKS = [
  { title: 'Compute 10! using the calculator', expression: '10!', result: '3628800' },
  { title: 'Compute 12^2 using the calculator', expression: '12^2', result: '144' },
  { title: 'Compute (1+2+3+4)! using the calculator', expression: '(1+2+3+4)!', result: '3628800' },
];

const seedExecutableTasks = async ({ space, chat }: { space: Space; chat: AssistantChat.Chat }) => {
  const taskSet = space.db.add(TaskSet.make({ name: 'Compute' }));
  storyTaskSet = taskSet;
  // A project chat files into the PROJECT's ledger (the resolution `peekTaskSetRef` uses); the
  // chat also carries the same ref so `Chat.TaskList` (which reads only `chat.taskSet` — see its
  // parent-walk TODO) renders the strip.
  const project = AssistantChat.peekProject(chat);
  if (project) {
    Obj.update(project, (project) => {
      project.taskSet = Ref.make(taskSet);
    });
  }
  Obj.update(chat, (chat) => {
    chat.taskSet = Ref.make(taskSet);
  });
  let previous: Task.Task | undefined;
  for (const { title } of EXECUTABLE_TASKS) {
    previous = Outline.addTask(space.db, taskSet, title, previous ? { dependsOn: [Ref.make(previous)] } : {});
  }
  await space.db.flush();
};

/** One scripted sub-agent per task, routed by the task title in the synthesized instructions. */
const subAgentRoute = ({ title, expression, result }: (typeof EXECUTABLE_TASKS)[number]) => ({
  name: `sub-agent-${expression}`,
  match: (request: ScriptedLanguageModel.ScriptedRequest) =>
    promptIncludes('non-interactive mode')(request) && promptIncludes(title)(request),
  turns: [
    { parts: [toolCall(Operation.toolName(Calculate), { expression })] },
    { parts: [toolCall('completeJob', { success: result })] },
    { parts: [text('Done.')] },
  ],
});

const chatNameRoute = {
  name: 'chat-name',
  match: promptIncludes('Suggest a name for this chat'),
  turns: [{ parts: [text('Task Demo')] }],
};

/** The planning skill's end-of-request reminder consults the model while tasks remain open. */
const planReminderRoute = {
  name: 'plan-reminder',
  match: promptIncludes('Reply with exactly one word'),
  turns: Array.from({ length: 4 }, () => ({ parts: [text('stop')] })),
};

/**
 * Two surfaces over a shared space: the conversational ChatModule (left) and the activity
 * TraceModule (right). Prompt the supervisor to delegate work to a sub-agent; DelegateTask records
 * it as a started plan task and the sub-agent process surfaces as a nested lane in the trace.
 */
export const WithSubAgents: Story = {
  decorators: createDecorators({
    // TODO(burdon): Move instructions to skill?
    createAgent: {
      name: 'Supervisor',
      instructions: 'You delegate units of work to sub-agents using the available tools.',
      project: 'Delegation',
    },
    lazyPlugins: async () => {
      const MarkdownPlugin = await import('@dxos/plugin-markdown/MarkdownPlugin');
      return {
        plugins: [MarkdownPlugin.make()],
      };
    },
    skills: [DelegationSkill.key, PlanningSkill.key, MarkdownSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
};

/**
 * Two surfaces over a shared space: ChatModule (left) and TracePanel (right).
 * Agent tool invocations populate the execution-graph timeline in the companion panel.
 */
export const WithExecutionGraph: Story = {
  decorators: createDecorators({
    config: config.remote,
    lazyPlugins: async () => {
      const MarkdownPlugin = await import('@dxos/plugin-markdown/MarkdownPlugin');
      return {
        plugins: [MarkdownPlugin.make()],
      };
    },
    skills: [MarkdownSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
  },
};

export const WithWebSearch: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const MarkdownPlugin = await import('@dxos/plugin-markdown/MarkdownPlugin');
      return {
        plugins: [MarkdownPlugin.make()],
      };
    },
    config: config.remote,
    skills: [WebSearchSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat]],
  },
};

/**
 * Chat over a pre-seeded working task set: `Chat.TaskList` renders the durable tasks between the
 * thread and the prompt from the first frame, status-grouped without headings.
 */
export const WithTasks: Story = {
  decorators: createDecorators({
    onChatCreated: async ({ space, chat }) => {
      const taskSet = space.db.add(TaskSet.make({ name: 'Launch plan' }));
      Obj.update(chat, (chat) => {
        chat.taskSet = Ref.make(taskSet);
      });
      // More than six rows, so the story also demonstrates the task strip's height cap.
      const seed: { title: string; status: NonNullable<Task.Task['status']> }[] = [
        { title: 'Source the beans', status: 'done' },
        { title: 'Dial in the roast', status: 'started' },
        { title: 'Print the labels', status: 'todo' },
        { title: 'Design the bag', status: 'todo' },
        { title: 'Photograph the pour', status: 'todo' },
        { title: 'Draft the launch email', status: 'todo' },
        { title: 'Schedule the tasting', status: 'todo' },
        { title: 'Update the price list', status: 'todo' },
      ];
      for (const { title, status } of seed) {
        Outline.addTask(space.db, taskSet, title, { status });
      }
      await space.db.flush();
    },
  }),
  args: {
    layout: [[StoryRole.Chat]],
  },
};

/**
 * Live twin of the drain: seeded with the same dependent tasks, a real model, and the calculator
 * tool — type a prompt yourself (e.g. "delegate all tasks", "do the first and last", "do all
 * tasks that don't have dependencies"). Live AI, so excluded from CI.
 */
export const WithTaskDrain: Story = {
  decorators: createDecorators({
    createAgent: {
      name: 'Supervisor',
      instructions: 'You track tasks and delegate them to sub-agents using the available tools.',
      project: 'Delegation',
    },
    skills: [DelegationSkill.key, PlanningSkill.key, CalculatorSkill.key],
    onChatCreated: seedExecutableTasks,
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
  tags: ['!test'],
};

//
// Play/test stories (`Test` prefix = has a play script). Live ones first (excluded from CI via
// `!test`); the `Scripted` suffix marks offline models, which run in CI.
//

export const TestPlanning: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const MarkdownPlugin = await import('@dxos/plugin-markdown/MarkdownPlugin');
      return {
        plugins: [MarkdownPlugin.make()],
      };
    },
    skills: [MarkdownSkill.key, PlanningSkill.key],
    onInit: captureSpace,
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
  // Live model: whether the agent reaches for `update-tasks` at all is model-behavioural, so this
  // stays out of CI. `TestPlanningScripted` is the deterministic counterpart.
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    await submitPrompt(canvasElement, 'Plan a three-step checklist for launching a coffee blend. Use your task tool.');

    // The skill writes checkbox lines into the conversation's outline document.
    const items = await waitForChecklist((items) => items.length >= 3, { timeout: 240_000 });
    if (items.length < 3) {
      throw new Error('Expected at least three checklist items.');
    }
  },
};

/**
 * Interaction test for end-to-end delegation: enters a prompt that delegates a unit of work,
 * then waits for the supervisor to run the sub-agent and fold its result back into the conversation.
 *
 * Live AI and timing-sensitive, so it is excluded from CI `test` runs (`tags: ['!test']`);
 * run it manually in storybook (it needs a reachable EDGE AI service via `config.remote`).
 */
export const TestDelegation: Story = {
  ...WithSubAgents,
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The chat prompt is a CodeMirror editor; locate it via its placeholder.
    const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 30_000 });
    const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
    if (!editor) {
      throw new Error('Chat editor not found.');
    }

    // Enter a prompt that delegates work to a sub-agent and submit it.
    await userEvent.click(editor);
    await userEvent.type(editor, 'Delegate a task to a sub-agent to compute 10 factorial.');
    await userEvent.keyboard('{Enter}');

    // The supervisor runs the sub-agent in the background and posts the result back to the chat.
    await canvas.findByText(/sub-agent completed/i, {}, { timeout: 180_000 });
  },
};

/**
 * Deterministic counterpart to {@link TestPlanning}: the scripted model calls `update-tasks` twice
 * (plan, then complete), so the checklist write-and-check-off path runs in CI. The second call
 * leaves no open items, which also keeps the end-of-request plan reminder from consulting the
 * model — the reminder only fires while work is outstanding.
 */
export const TestPlanningScripted: Story = {
  decorators: createDecorators({
    skills: [PlanningSkill.key],
    onInit: captureSpace,
    scripted: [
      {
        name: 'chat-name',
        match: promptIncludes('Suggest a name for this chat'),
        turns: [{ parts: [text('Launch Plan')] }],
      },
      {
        name: 'planner',
        match: () => true,
        turns: [
          {
            parts: [
              text('Here is the plan.'),
              toolCall(Operation.toolName(PlanningOperations.UpdateTasks), {
                tasks: [
                  { title: 'Source the beans', status: 'started' },
                  { title: 'Dial in the roast', status: 'todo' },
                  { title: 'Print the labels', status: 'todo' },
                ],
              }),
            ],
          },
          {
            parts: [
              toolCall(Operation.toolName(PlanningOperations.UpdateTasks), {
                tasks: [
                  { title: 'Source the beans', status: 'done' },
                  { title: 'Dial in the roast', status: 'done' },
                  { title: 'Print the labels', status: 'done' },
                ],
              }),
            ],
          },
          { parts: [text('All three steps are done.')] },
        ],
      },
    ],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, 'Plan the launch.');

    // Items are upserted by title, so the three survive the second call rather than duplicating.
    const planned = await waitForChecklist((items) => items.length === 3);
    if (planned.map(({ title }) => title).join('|') !== 'Source the beans|Dial in the roast|Print the labels') {
      throw new Error(`Unexpected checklist: ${JSON.stringify(planned)}`);
    }

    await waitForChecklist((items) => items.length === 3 && items.every(({ done }) => done));
    await canvas.findByText(/All three steps are done/i, {}, { timeout: 30_000 });
  },
};

/**
 * Deterministic end-to-end delegation over a scripted (offline) model — the storybook analog of
 * `assistant-toolkit/src/supervisor/delegation-strategy.test.ts`, sharing the same routed turn
 * script: the sub-agent route keys on the `RunInstructions` "non-interactive mode" system prompt,
 * the chat-naming turn has its own route, and the supervisor is the fallback. Runs in CI.
 */
export const TestDelegationScripted: Story = {
  decorators: createDecorators({
    createAgent: {
      name: 'Supervisor',
      instructions: 'You delegate units of work to sub-agents using the available tools.',
      project: 'Delegation',
    },
    lazyPlugins: async () => {
      const MarkdownPlugin = await import('@dxos/plugin-markdown/MarkdownPlugin');
      return {
        plugins: [MarkdownPlugin.make()],
      };
    },
    skills: [DelegationSkill.key, PlanningSkill.key, MarkdownSkill.key],
    onInit: captureSpace,
    scripted: [
      {
        name: 'sub-agent',
        match: promptIncludes('non-interactive mode'),
        turns: [{ parts: [toolCall('completeJob', { success: '3628800' })] }, { parts: [text('Done.')] }],
      },
      {
        name: 'chat-name',
        match: promptIncludes('Suggest a name for this chat'),
        turns: [{ parts: [text('Delegation Demo')] }],
      },
      {
        name: 'supervisor',
        match: () => true,
        turns: [
          {
            parts: [
              text('On it — delegating.'),
              toolCall(Operation.toolName(DelegationOperations.DelegateTask), { title: TASK_TITLE }),
            ],
          },
          { parts: [text('Delegated. I will report back when it completes.')] },
        ],
      },
    ],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 30_000 });
    const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
    if (!editor) {
      throw new Error('Chat editor not found.');
    }

    await userEvent.click(editor);
    await userEvent.type(editor, 'Delegate a task to a sub-agent to compute 10 factorial.');
    await userEvent.keyboard('{Enter}');

    // The immediate reply streams before the sub-agent runs.
    await canvas.findByText(/On it — delegating/i, {}, { timeout: 30_000 });

    // Delegation is the promotion moment: the durable task it creates is mirrored into the
    // conversation's checklist, unchecked while the sub-agent works.
    await waitForChecklist((items) => items.some(({ title, done }) => title === TASK_TITLE && !done));

    // The supervisor spawns the sub-agent after the turn and folds its result back.
    await canvas.findByText(/sub-agent completed/i, {}, { timeout: 60_000 });
    await canvas.findByText(/3628800/, {}, { timeout: 10_000 });

    // ...and completing the delegated work checks the item off, closing the loop.
    await waitForChecklist((items) => items.some(({ title, done }) => title === TASK_TITLE && done));
  },
};

/**
 * The assistant executes task 1 itself: marks it started, computes through the calculator tool,
 * and marks it done — tasks 2 and 3 stay untouched. Scripted, so it runs in CI.
 */
export const TestTaskExecutionScripted: Story = {
  decorators: createDecorators({
    skills: [PlanningSkill.key, CalculatorSkill.key],
    onInit: captureSpace,
    onChatCreated: seedExecutableTasks,
    scripted: [
      chatNameRoute,
      planReminderRoute,
      {
        name: 'assistant',
        match: () => true,
        turns: [
          {
            parts: [
              text('Starting task 1.'),
              toolCall(Operation.toolName(PlanningOperations.UpdateTasks), {
                tasks: [{ title: EXECUTABLE_TASKS[0].title, status: 'started' }],
              }),
            ],
          },
          { parts: [toolCall(Operation.toolName(Calculate), { expression: EXECUTABLE_TASKS[0].expression })] },
          {
            parts: [
              toolCall(Operation.toolName(PlanningOperations.UpdateTasks), {
                tasks: [{ title: EXECUTABLE_TASKS[0].title, status: 'done' }],
              }),
            ],
          },
          { parts: [text('Task 1 complete: 10! = 3628800.')] },
        ],
      },
    ],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, 'Execute task 1.');

    await canvas.findByText(/Task 1 complete/i, {}, { timeout: 90_000 });
    // Only the first task completed; its dependents remain open.
    await waitForChecklist((items) => items.length === 3 && items[0].done && !items[1].done && !items[2].done, {
      timeout: 90_000,
    });
  },
};

/**
 * The assistant delegates task 1 to a sub-agent via the delegate-tasks verb: the reconcile loop
 * spawns the sub-agent (marking the task started), the sub-agent computes through the calculator,
 * and the supervisor marks it done on exit. Scripted, so it runs in CI.
 */
export const TestTaskDelegationScripted: Story = {
  decorators: createDecorators({
    createAgent: {
      name: 'Supervisor',
      instructions: 'You delegate tasks to sub-agents using the available tools.',
      project: 'Delegation',
    },
    skills: [DelegationSkill.key, CalculatorSkill.key],
    onInit: captureSpace,
    onChatCreated: seedExecutableTasks,
    scripted: [
      subAgentRoute(EXECUTABLE_TASKS[0]),
      chatNameRoute,
      {
        name: 'supervisor',
        match: () => true,
        turns: [
          {
            parts: [
              text('Delegating task 1.'),
              toolCall(Operation.toolName(DelegationOperations.DelegateTasks), { tasks: [1] }),
            ],
          },
          { parts: [text('Task 1 delegated. I will report back when it completes.')] },
        ],
      },
    ],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, 'Delegate task 1 to a sub-agent.');

    await canvas.findByText(/Task 1 delegated/i, {}, { timeout: 90_000 });
    // The reconcile spawns the sub-agent and folds the result back.
    await canvas.findByText(/sub-agent completed/i, {}, { timeout: 90_000 });
    await waitForChecklist((items) => items.length === 3 && items[0].done && !items[1].done && !items[2].done, {
      timeout: 90_000,
    });
  },
};

/**
 * The assistant delegates ALL tasks at once; the reconcile loop drains them in dependency order —
 * each task's sub-agent spawns only once its predecessor is done, and each completion turn
 * re-runs the reconcile. Scripted, so it runs in CI.
 */
export const TestTaskDrainScripted: Story = {
  decorators: createDecorators({
    createAgent: {
      name: 'Supervisor',
      instructions: 'You delegate tasks to sub-agents using the available tools.',
      project: 'Delegation',
    },
    skills: [DelegationSkill.key, CalculatorSkill.key],
    onInit: captureSpace,
    onChatCreated: seedExecutableTasks,
    scripted: [
      ...EXECUTABLE_TASKS.map(subAgentRoute),
      chatNameRoute,
      {
        name: 'supervisor',
        match: () => true,
        turns: [
          {
            parts: [
              text('Delegating all three tasks; they will run in dependency order.'),
              toolCall(Operation.toolName(DelegationOperations.DelegateTasks), { tasks: [1, 2, 3] }),
            ],
          },
          { parts: [text('All three delegated; the sub-agents will report back as each completes.')] },
        ],
      },
    ],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, 'Delegate all tasks to sub-agents and keep going until all are done.');

    await canvas.findByText(/All three delegated/i, {}, { timeout: 90_000 });
    // The runtime drains the batch in dependency order, re-reconciling as each sub-agent exits;
    // the checklist reaching all-done IS the loop closing.
    await waitForChecklist((items) => items.length === 3 && items.every(({ done }) => done), { timeout: 180_000 });
    const foldBacks = await canvas.findAllByText(/sub-agent completed/i, {}, { timeout: 30_000 });
    if (foldBacks.length !== 3) {
      throw new Error(`Expected three fold-back messages; saw ${foldBacks.length}.`);
    }
  },
};
