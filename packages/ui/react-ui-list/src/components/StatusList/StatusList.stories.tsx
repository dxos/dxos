//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import * as Card from '@dxos/react-ui/Card';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';

import { StatusList, type StatusListStatus } from './StatusList.tsx';

type Task = {
  id: string;
  title: string;
  /** How the task ends once the run has passed it; `success` unless said. */
  outcome?: 'success' | 'failed';
};

const STATUS_LABELS: Record<StatusListStatus, string> = {
  'success': 'Done',
  'failed': 'Failed',
  'not-started': 'Not started',
  'working': 'Working',
};

const TASKS: Task[] = [
  { id: 'merge', title: 'Fetch and merge origin/main' },
  { id: 'conflicts', title: 'Resolve conflicts and check markers' },
  { id: 'workaround', title: 'Drop the Listbox workaround main now fixes', outcome: 'failed' },
  { id: 'build', title: 'Build, typecheck and test the spike' },
  { id: 'story', title: 'Check the call log rows in the story' },
  { id: 'push', title: 'Format, commit and push' },
];

type StoryArgs = {
  tasks: Task[];
  /** Index of the task being worked on: those before it have ended, those after have not started. */
  active: number;
  /** Milliseconds each task is worked on before the run moves to the next; `0` holds the run at `active`. */
  interval: number;
  /** Status icons in the text colours instead of the success and error ones. */
  monochrome?: boolean;
};

/**
 * One card of tasks, run in order: the run starts at `active`, moves on every `interval`, rests with every task ended,
 * then starts again from the first. A failed task carries a retry action in the card's end rail.
 */
const DefaultStory = ({ tasks, active: initialActive, interval, monochrome }: StoryArgs) => {
  const [active, setActive] = useState(initialActive);
  useEffect(() => {
    setActive(initialActive);
    if (interval <= 0) {
      return;
    }
    const timer = setInterval(() => setActive((current) => (current >= tasks.length ? 0 : current + 1)), interval);
    return () => clearInterval(timer);
  }, [initialActive, interval, tasks.length]);

  const statusOf = (task: Task, index: number): StatusListStatus =>
    index < active ? (task.outcome ?? 'success') : index === active ? 'working' : 'not-started';

  return (
    <StatusList.Root aria-label='Tasks' monochrome={monochrome}>
      {tasks.map((task, index) => {
        const status = statusOf(task, index);
        return (
          <StatusList.Item
            key={task.id}
            status={status}
            statusLabel={STATUS_LABELS[status]}
            end={
              status === 'failed' ? (
                <Card.Action icon='ph--arrow-clockwise--regular' label={`Retry ${task.title}`} />
              ) : null
            }
            data-testid={`task-${task.id}`}
          >
            {task.title}
          </StatusList.Item>
        );
      })}
    </StatusList.Root>
  );
};

const meta = {
  title: 'ui/react-ui-list/StatusList',
  render: DefaultStory,
  decorators: [withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { tasks: TASKS, active: 3, interval: 1_500 },
  parameters: { layout: 'centered', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The run moves through the tasks; it opens with every status on show. */
export const Default: Story = {};

/** The run held at the fourth task: two done, one failed, one working, two not started. */
export const Paused: Story = {
  args: { interval: 0 },
};

/** `monochrome`: the icons take the text colours, so their shapes tell the statuses apart. */
export const Monochrome: Story = {
  args: { monochrome: true },
};

/** A title longer than the card truncates, and the row keeps its height. */
export const LongTitles: Story = {
  args: {
    interval: 0,
    tasks: TASKS.map((task) => ({
      ...task,
      title: `${task.title}, then report what changed and what is still open to the session that asked`,
    })),
  },
};

/**
 * The card is a list of one item per task. Each status has its own icon, named for assistive tech; only the working
 * one animates, and its title is the one at full emphasis. Icons share the start rail, titles the content edge, and
 * the retry action sits in the end rail.
 */
export const Test: Story = {
  args: { interval: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole('list', { name: 'Tasks' });
    await expect(within(list).getAllByRole('listitem')).toHaveLength(TASKS.length);

    const part = (id: string, selector: string) => {
      const element = canvas.getByTestId(`task-${id}`).querySelector<HTMLElement | SVGSVGElement>(selector);
      if (!element) {
        throw new Error(`No ${selector} in task ${id}`);
      }
      return element;
    };
    const ROWS = { success: 'merge', failed: 'workaround', working: 'build', pending: 'story' };
    for (const [key, id] of Object.entries(ROWS)) {
      const status = key === 'pending' ? 'not-started' : key;
      await expect(canvas.getByTestId(`task-${id}`)).toHaveAttribute('data-status', status);
    }

    const icons = Object.values(ROWS).map((id) => part(id, '[data-rail="start"] svg'));
    await expect(new Set(icons.map((svg) => svg.dataset.icon)).size).toBe(4);
    await expect(new Set(icons.map((svg) => getComputedStyle(svg).color)).size).toBe(4);
    await expect(part(ROWS.failed, '[data-rail="start"] svg')).toHaveAccessibleName('Failed');
    // The working icon is still for a reader who prefers reduced motion.
    const spin = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'dx-spin';
    for (const id of Object.values(ROWS)) {
      const animation = getComputedStyle(part(id, '[data-rail="start"] svg')).animationName;
      await expect(animation).toBe(id === ROWS.working ? spin : 'none');
    }

    // Only the working task's title is at full emphasis.
    const titleColor = (id: string) => getComputedStyle(part(id, '[data-part="row-content"] > *')).color;
    for (const id of [ROWS.success, ROWS.failed, ROWS.pending]) {
      await expect(titleColor(id)).toBe(titleColor(ROWS.success));
      await expect(titleColor(id)).not.toBe(titleColor(ROWS.working));
    }

    // One start rail and one content edge for every row.
    const left = (id: string, selector: string) => part(id, selector).getBoundingClientRect().left;
    for (const { id } of TASKS) {
      await expect(left(id, '[data-rail="start"]')).toBeCloseTo(left(ROWS.success, '[data-rail="start"]'), 0);
      await expect(left(id, '[data-part="row-content"]')).toBeCloseTo(
        left(ROWS.success, '[data-part="row-content"]'),
        0,
      );
    }

    // The retry action is in the end rail, past the title.
    const retry = canvas.getByRole('button', { name: /^Retry/ }).getBoundingClientRect();
    const title = part(ROWS.failed, '[data-part="row-content"]').getBoundingClientRect();
    await expect(retry.left).toBeGreaterThanOrEqual(title.right - 0.5);
  },
};
