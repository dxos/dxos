//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';

import { ThreadColumns } from '../components/index.ts';
import { StoryRole } from '../modules/index.ts';
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
  render: () => <ThreadColumns suggestions={[LAUNCH_REQUEST, SIDE_QUESTION]} />,
  decorators: columnsDecorators,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: LAUNCH_REQUEST }, { timeout: 60_000 }));

    // A column per subagent opens beside the agent's.
    await waitForColumns(canvasElement, 1 + LAUNCH_TASKS.length, 60_000);

    // The reader keeps talking while they work; the reply comes once the agent's current wait returns. Selecting the
    // agent's column brings its composer, and the next chip, back.
    const agentColumn = canvasElement.querySelector<HTMLElement>('[data-testid="chat-plane.column"]');
    if (!agentColumn) {
      throw new Error('The agent column is not open.');
    }
    await userEvent.click(agentColumn);
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
  render: () => <ThreadColumns suggestions={[LAUNCH_REQUEST, SIDE_QUESTION]} />,
  decorators: columnsDecorators,
  tags: ['!test'],
};
