//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { DelegationSkill, PlanningSkill, WebSearchSkill } from '@dxos/assistant-toolkit';
import { Filter } from '@dxos/echo';
import { MarkdownSkill } from '@dxos/plugin-markdown';
import { type Space } from '@dxos/react-client/echo';
import { Outline } from '@dxos/types';

import { StoryRole } from '../modules';
import { ModuleContainer, config, createDecorators, storyParameters } from '../testing';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Chat',
  render: ModuleContainer,
  parameters: storyParameters,
};

const { text, toolCall, promptIncludes } = ScriptedLanguageModel;

/** Shared by the delegation script and its assertions. */
const TASK_TITLE = 'Compute 10 factorial';

// Captured by `onInit` so play functions can assert on the real objects the skills write, rather
// than on rendered text (no surface in these layouts renders the outline).
let storySpace: Space | undefined;

const captureSpace = async ({ space }: { space: Space }) => {
  storySpace = space;
};

/** The conversation's working checklist — for these chats, the chat's own lazily created outline. */
const readChecklist = async (): Promise<Outline.ChecklistItem[]> => {
  if (!storySpace) {
    return [];
  }
  const [outline] = await storySpace.db.query(Filter.type(Outline.Outline)).run();
  const text = outline && (await outline.content.load());
  return text ? Outline.parseChecklist(text.content) : [];
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
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
      };
    },
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Logging, StoryRole.Config]],
  },
};

/**
 * Two surfaces over a shared space: the conversational ChatModule (left) and the activity
 * TraceModule (right). Prompt the supervisor to delegate work to a sub-agent; DelegateTask records
 * it as an in-progress plan task and the sub-agent process surfaces as a nested lane in the trace.
 */
export const WithSubAgents: Story = {
  decorators: createDecorators({
    // TODO(burdon): Move instructions to skill?
    createAgent: {
      name: 'Supervisor',
      instructions: 'You delegate units of work to sub-agents using the available tools.',
    },
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
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
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
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
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
      };
    },
    config: config.remote,
    skills: [WebSearchSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat]],
  },
};

export const WithPlanning: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
      };
    },
    skills: [MarkdownSkill.key, PlanningSkill.key],
    onInit: captureSpace,
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace'), StoryRole.Context]],
  },
  // Live model: whether the agent reaches for `update-tasks` at all is model-behavioural, so this
  // stays out of CI. `WithPlanningScripted` is the deterministic counterpart.
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
 * Deterministic counterpart to {@link WithPlanning}: the scripted model calls `update-tasks` twice
 * (plan, then complete), so the checklist write-and-check-off path runs in CI. The second call
 * leaves no open items, which also keeps the end-of-request plan reminder from consulting the
 * model — the reminder only fires while work is outstanding.
 */
export const WithPlanningScripted: Story = {
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
              toolCall('update-tasks', {
                tasks: [
                  { title: 'Source the beans', status: 'in-progress' },
                  { title: 'Dial in the roast', status: 'todo' },
                  { title: 'Print the labels', status: 'todo' },
                ],
              }),
            ],
          },
          {
            parts: [
              toolCall('update-tasks', {
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
 * Interaction test for end-to-end delegation: enters a prompt that delegates a unit of work,
 * then waits for the supervisor to run the sub-agent and fold its result back into the conversation.
 *
 * Live AI and timing-sensitive, so it is excluded from CI `test` runs (`tags: ['!test']`);
 * run it manually in storybook (it needs a reachable EDGE AI service via `config.remote`).
 */
export const WithSubAgentsTest1: Story = {
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
 * Deterministic end-to-end delegation over a scripted (offline) model — the storybook analog of
 * `assistant-toolkit/src/supervisor/delegation-strategy.test.ts`, sharing the same routed turn
 * script: the sub-agent route keys on the `RunInstructions` "non-interactive mode" system prompt,
 * the chat-naming turn has its own route, and the supervisor is the fallback. Runs in CI.
 */
export const WithSubAgentsTest2: Story = {
  decorators: createDecorators({
    createAgent: {
      name: 'Supervisor',
      instructions: 'You delegate units of work to sub-agents using the available tools.',
    },
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
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
          { parts: [text('On it — delegating.'), toolCall('delegate-task', { title: TASK_TITLE })] },
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
