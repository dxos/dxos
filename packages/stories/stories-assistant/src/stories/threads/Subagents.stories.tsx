//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import type * as Chat from '@dxos/plugin-assistant/Chat';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';

import { ThreadColumns } from '../../components/index.ts';
import { LAUNCH_REQUEST, LAUNCH_TASKS, PLANS, SAVINGS_PROMPTS, Scripts, SIDE_QUESTION } from '../../scripts/index.ts';
import { CalculatorSkill, createDecorators, storyParameters } from '../../testing/index.ts';

type StoryArgs = {
  /** Prompts offered as chips above the composer, one at a time, in the order they are meant to be sent. */
  suggestions?: readonly string[];
  /** The drawer open above the agent's prompt at the start. */
  defaultDrawer?: Chat.RootProps['defaultDrawer'];
  /** Shows the column with every process and thread of the run. */
  trace?: boolean;
};

/**
 * Subagents on light threads: the agent delegates self-contained tasks with `thread_delegate`; each runs in a
 * background thread of its own that starts with nothing but its task, and only its final answer joins the
 * conversation. The agent's chat stays in the first column, at the start of the strip, where each subagent also
 * shows as a card; the second column shows the processes and every thread of the whole run as one graph; and every
 * active subagent has a column of its own beside them, showing its reasoning and its slice of memory. A subagent's
 * column closes once it reports, and the strip scrolls sideways when the columns outgrow it. The agent waits for the
 * subagents with `thread_wait` while the reader keeps chatting.
 *
 * Two scenarios: savings plans, where three subagents each work a calculation, and the launch kit, where four each
 * write a document. See `packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl` (F-8, QA-4, QA-6).
 */
const meta: Meta<StoryArgs> = {
  title: 'stories/stories-assistant/threads/Subagents',
  component: ThreadColumns,
  parameters: storyParameters,
  args: {
    trace: true,
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** The columns that are always open: the agent's chat, and the processes and threads of the whole run. */
const FIXED_COLUMNS = 2;

/** Waits until exactly `subagents` subagent columns are open beside the fixed ones. */
const waitForSubagents = (canvasElement: HTMLElement, subagents: number, timeout: number) =>
  waitFor(
    () =>
      expect(canvasElement.querySelectorAll('[data-testid="chat-plane.column"]').length).toBe(
        FIXED_COLUMNS + subagents,
      ),
    { timeout },
  );

//
// Savings plans: three subagents each compute one plan with the calculator.
//

const savingsPlans: Story = {
  decorators: createDecorators({
    skills: [CalculatorSkill.key],
    scriptedModels: { scenes: { savingsPlans: Scripts.savingsPlans }, select: 'savingsPlans' },
    assistantSettings: { parallelThreads: true },
  }),
  args: {
    suggestions: [SAVINGS_PROMPTS.compare, SAVINGS_PROMPTS.quick],
  },
};

/**
 * Savings plans, scripted (offline), for a person or a recorded walkthrough to drive.
 *
 * Test:
 * 1. Click the chip that asks to compare three savings plans: a column opens beside the chat for each plan, showing
 *    its subagent working, and a card for each shows in the chat.
 * 2. Click the chip that asks what 17 × 23 is while they work: the agent answers 391 at once.
 * 3. Watch the processes and threads column: each subagent is a lane of the one graph, and joins it when it reports.
 * 4. Wait: each subagent's column closes once it reports, and the agent compares the three plans.
 */
export const Default: Story = { ...savingsPlans };

/** {@link Default} driven by a play function: three plans are delegated and a side question answered. */
export const Scripted: Story = {
  ...savingsPlans,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: SAVINGS_PROMPTS.compare }, { timeout: 60_000 }));

    // Every subagent works in a column of its own, and shows as a card in the agent's chat.
    await waitForSubagents(canvasElement, PLANS.length, 60_000);
    await waitFor(() => expect(canvas.getAllByTestId('chat.lane-card').length).toBeGreaterThanOrEqual(PLANS.length), {
      timeout: 30_000,
    });

    // The reader keeps talking while they work.
    await userEvent.click(await canvas.findByRole('button', { name: SAVINGS_PROMPTS.quick }, { timeout: 30_000 }));
    await canvas.findAllByText(/17 × 23 = 391/, {}, { timeout: 30_000 });

    // Every column closes once its subagent reports, and the comparison lands in the agent's chat.
    await canvas.findAllByText(/two extra points a year/, {}, { timeout: 120_000 });
    await waitForSubagents(canvasElement, 0, 60_000);
  },
};

//
// Launch kit: four subagents each write a document.
//

const launchKit: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const SpacePlugin = await import('@dxos/plugin-space/SpacePlugin');
      // Files the documents the subagents create.
      return { plugins: [SpacePlugin.make({})] };
    },
    skills: [MarkdownSkill.key, PlanningSkill.key],
    scriptedModels: { scenes: { launchKit: Scripts.launchKit }, select: 'launchKit' },
    assistantSettings: { parallelThreads: true, parallelThreadLimit: 6 },
  }),
  args: {
    suggestions: [LAUNCH_REQUEST, SIDE_QUESTION],
    // Open from the start, so the checklist is seen filling in as the agent plans and ticking off as subagents report.
    defaultDrawer: 'tasks',
  },
};

/**
 * Launch kit, scripted (offline), for a person or a recorded walkthrough to drive.
 *
 * Test:
 * 1. Click the chip that asks for the Composer 1.0 launch kit: the task list above the prompt fills with four tasks,
 *    a column opens beside the chat for each of the four documents, and the chat's own column stays where it was.
 * 2. Scroll the strip sideways to reach the columns past the edge.
 * 3. Click the chip that asks which day to launch: the chat answers while the subagents keep working.
 * 4. Wait: each column closes once its subagent reports, and the summary lands in the chat's column.
 */
export const LaunchKit: Story = { ...launchKit };

/** {@link LaunchKit} driven by a play function: the launch kit is delegated, a side question is answered meanwhile. */
export const LaunchKitScripted: Story = {
  ...launchKit,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: LAUNCH_REQUEST }, { timeout: 60_000 }));

    // A column per subagent opens beside the chat's.
    await waitForSubagents(canvasElement, LAUNCH_TASKS.length, 60_000);

    // The reader keeps talking while they work; the reply comes once the agent's current wait returns.
    await userEvent.click(await canvas.findByRole('button', { name: SIDE_QUESTION }, { timeout: 30_000 }));
    await canvas.findAllByText(/Tuesday the 18th/, {}, { timeout: 90_000 });

    // Every subagent's column closes once it reports, and the summary lands in the chat's column with each document.
    await waitForSubagents(canvasElement, 0, 120_000);
    await canvas.findAllByText(/The launch kit is ready/, {}, { timeout: 60_000 });
    for (const { document } of LAUNCH_TASKS) {
      await canvas.findAllByText(document, { exact: false });
    }
  },
};
