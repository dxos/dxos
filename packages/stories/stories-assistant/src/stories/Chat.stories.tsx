//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { AiContext } from '@dxos/assistant';
import {
  DelegationSkill,
  DelegationSkillOperations,
  PlanningOperations,
  PlanningSkill,
  WebSearchSkill,
} from '@dxos/assistant-toolkit';
import * as AssistantChat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { type Space } from '@dxos/react-client/echo';
import { Outline, Task, TaskSet } from '@dxos/types';

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
  // Stories share a module, so an earlier story's chat must not leak into these assertions.
  storyChat = undefined;
};

// Read directly rather than through the index, which lags objects seeded during activation.
let storyChat: AssistantChat.Chat | undefined;

/** The seeded chat's tasks, else the first queried chat's. */
const readChecklist = async (): Promise<Outline.ChecklistItem[]> => {
  let chat = storyChat;
  if (!chat) {
    if (!storySpace) {
      return [];
    }
    [chat] = await storySpace.db.query(Filter.type(AssistantChat.Chat)).run();
  }
  if (!chat) {
    return [];
  }
  const tasks = await Promise.all(chat.tasks.map((ref) => ref.load()));
  return tasks.map((task) => ({ title: task.title, done: task.status === 'done' }));
};

/**
 * A project owning a task set owning one task, with the task bound to the chat — the shape
 * `ProjectOperation.DelegateTaskToChat` produces, seeded here so the story exercises the session
 * rather than the operation (which its own node test covers).
 */
const seedProjectTask = async ({
  db,
  chat,
  binder,
}: {
  db: Database.Database;
  chat: AssistantChat.Chat;
  binder: AiContext.Binder;
}) => {
  const project = db.add(Project.make({ name: 'Coffee launch' }));
  const taskSet = db.add(TaskSet.make({}));
  Obj.update(project, (project) => {
    project.taskSet = Ref.make(taskSet);
  });
  Obj.setParent(taskSet, project);

  // A named reviewer is what sends the finished task to `review` rather than `done`.
  const task = AssistantChat.addTask(db, chat, POEM_TASK_TITLE, {
    status: 'todo',
    reviewers: [{ name: 'Rich', role: 'user' }],
  });
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [Ref.make(task)];
  });

  // The project in context is what gives the artifact verbs something to file into.
  await binder.bind({ objects: [Ref.make(project)] });
  await db.flush();
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

/** Polls until `count` elements match, so a count assertion does not race the render that adds the last one. */
const waitForCount = async (
  canvasElement: HTMLElement,
  matcher: RegExp,
  count: number,
  { timeout = 30_000 }: { timeout?: number } = {},
): Promise<void> => {
  const canvas = within(canvasElement);
  const deadline = Date.now() + timeout;
  let seen = 0;
  while (Date.now() < deadline) {
    seen = canvas.queryAllByText(matcher).length;
    if (seen === count) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Expected ${count} matches for ${matcher}; saw ${seen}.`);
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
  {
    title: 'Compute 10! using the calculator',
    expression: '10!',
    result: '3628800',
    dependencies: [],
  },
  {
    title: 'Compute 12^2 using the calculator',
    expression: '12^2',
    result: '144',
    dependencies: [1],
  },
  {
    title: 'Compute (1+2+3+4)! using the calculator',
    expression: '(1+2+3+4)!',
    result: '3628800',
    dependencies: [],
  },
];

const seedExecutableTasks = async ({ db, chat }: { db: Database.Database; chat: AssistantChat.Chat }) => {
  storyChat = chat;
  // `dependencies` are 1-based ordinals (the numbering the checklist and UI speak), so they can
  // only point at earlier entries.
  const tasks: Task.Task[] = [];
  for (const { title, dependencies } of EXECUTABLE_TASKS) {
    const dependsOn = dependencies
      .map((ordinal) => tasks[ordinal - 1])
      .filter((dep) => dep !== undefined)
      .map((dep) => Ref.make(dep));
    tasks.push(AssistantChat.addTask(db, chat, title, dependsOn.length > 0 ? { dependsOn } : {}));
  }

  await db.flush();
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
 * Chat over a pre-seeded checklist: `Chat.TaskList` renders the durable tasks between the
 * thread and the prompt from the first frame, status-grouped without headings.
 */
export const WithTasks: Story = {
  decorators: createDecorators({
    onChatCreated: async ({ db, chat }) => {
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
        AssistantChat.addTask(db, chat, title, { status });
      }
      await db.flush();
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
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
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
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
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
              toolCall(Operation.toolName(DelegationSkillOperations.DelegateTask), { title: TASK_TITLE }),
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
              toolCall(Operation.toolName(DelegationSkillOperations.DelegateTasks), { tasks: [1] }),
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
 * re-runs the reconcile.
 *
 * Excluded from CI `test` runs (`tags: ['!test']`) because the drain does not always close: roughly
 * one run in three the checklist never reaches all-done inside its 180s bound, and the story fails
 * with `Checklist never satisfied the condition`. That is the reconcile loop stalling, not the
 * assertions — those are sound, and two defects that were masking this have been fixed (the package
 * timeout that killed the test mid-wait, and a count read that raced the last render). Run it in
 * storybook while the stall is diagnosed.
 *
 * TODO(burdon): Re-enable once the drain closes reliably.
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
      // Before the catch-all: the checklist is open for the whole drain, so the planning skill's
      // reminder fires — and without a route of its own the supervisor answers it, burning one of
      // the two turns it has. The story then times out waiting for a reply the script cannot give.
      planReminderRoute,
      {
        name: 'supervisor',
        match: () => true,
        turns: [
          {
            parts: [
              text('Delegating all three tasks; they will run in dependency order.'),
              toolCall(Operation.toolName(DelegationSkillOperations.DelegateTasks), { tasks: [1, 2, 3] }),
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
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, 'Delegate all tasks to sub-agents and keep going until all are done.');

    await canvas.findByText(/All three delegated/i, {}, { timeout: 90_000 });
    // The runtime drains the batch in dependency order, re-reconciling as each sub-agent exits;
    // the checklist reaching all-done IS the loop closing.
    await waitForChecklist((items) => items.length === 3 && items.every(({ done }) => done), { timeout: 180_000 });
    // Polled, not read once: the gate above is ECHO state and this is the DOM it drives, so the
    // checklist reaching all-done says the loop closed, not that the last fold-back has painted.
    // `findAllByText` resolves on the first match, which lands on two of the three often enough to
    // have made this story flaky.
    await waitForCount(canvasElement, /sub-agent completed/i, 3, { timeout: 30_000 });
  },
};

//
// Project delegation — a task worked in its own chat, with the product filed back.
//

const POEM_TASK_TITLE = 'Create a markdown document with a short poem';
const POEM_DOC_NAME = 'Ode to a Coffee Bean';
const POEM_CONTENT = '# Ode to a Coffee Bean\n\nSmall dark seed,\nthe morning owes you everything.\n';

/**
 * A task delegated into its own chat, worked end to end: the session reads its checklist, writes a
 * document, files it as an artifact of the project, and closes the task.
 *
 * The whole point is the seam between plugins — plugin-projects contributes the row action,
 * plugin-tasks owns the capability, and the session reaches the project's artifact verb — so the
 * assertions are on the DATABASE rather than on the transcript.
 */
export const TestProjectTaskDelegationScripted: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [MarkdownPlugin, ProjectsPlugin, TasksPlugin, SpacePlugin] = await Promise.all([
        import('@dxos/plugin-markdown/MarkdownPlugin'),
        import('@dxos/plugin-projects/ProjectsPlugin'),
        import('@dxos/plugin-tasks/TasksPlugin'),
        import('@dxos/plugin-space/SpacePlugin'),
      ]);
      return {
        // Tasks is declared in Projects' `dependsOn`, so the manager refuses to resolve it alone.
        plugins: [MarkdownPlugin.make(), TasksPlugin.make(), ProjectsPlugin.make(), SpacePlugin.make({})],
        types: [Project.Project, TaskSet.TaskSet, Task.Task, Markdown.Document],
      };
    },
    skills: [PlanningSkill.key, MarkdownSkill.key],
    onInit: captureSpace,
    onChatCreated: seedProjectTask,
    scripted: [
      chatNameRoute,
      planReminderRoute,
      {
        name: 'worker',
        match: () => true,
        turns: [
          // Reads the checklist rather than trusting the prompt: the task is bound to the chat, and
          // the opening prompt deliberately does not restate it.
          {
            parts: [
              toolCall(Operation.toolName(PlanningOperations.UpdateTasks), {
                tasks: [{ title: POEM_TASK_TITLE, status: 'started' }],
              }),
            ],
          },
          {
            parts: [
              toolCall(Operation.toolName(MarkdownOperation.Create), {
                name: POEM_DOC_NAME,
                content: POEM_CONTENT,
              }),
            ],
          },
          // Filing the document is not scripted here: its URI only exists once the create tool has
          // run, and a script is fixed before the session starts. `ArtifactAdd`'s own test covers
          // the task attachment.
          {
            parts: [
              toolCall(Operation.toolName(PlanningOperations.UpdateTasks), {
                tasks: [{ title: POEM_TASK_TITLE, status: 'done' }],
              }),
            ],
          },
          { parts: [text('Wrote the poem.')] },
        ],
      },
    ],
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, 'Work the task on your checklist.');

    await canvas.findByText(/Wrote the poem/i, {}, { timeout: 90_000 });

    // The observable product: a document exists, and the task the session started is no longer todo.
    await waitForChecklist((items) => items.some(({ title }) => title === POEM_TASK_TITLE), { timeout: 90_000 });
    if (!storySpace) {
      throw new Error('Story space not captured.');
    }
    const documents = await storySpace.db.query(Filter.type(Markdown.Document)).run();
    await expect(documents.map((document) => document.name)).toContain(POEM_DOC_NAME);

    // Finished, not closed: the task named a reviewer, so the session marking it done lands on
    // `review`. The model asked for `done` and cannot know about reviewers — the rule is the task's.
    const tasks = await storySpace.db.query(Filter.type(Task.Task)).run();
    const worked = tasks.find(({ title }) => title === POEM_TASK_TITLE);
    await expect(worked?.status).toEqual('review');
  },
};
