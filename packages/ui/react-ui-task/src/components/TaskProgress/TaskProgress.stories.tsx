//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, within } from 'storybook/test';

import { Obj } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';

import { translations } from '#translations';

import { TaskProgress } from './TaskProgress.tsx';

type Step = {
  title: string;
  /** The status the task ends in once the run has passed it; `done` unless said. */
  outcome?: Task.Status;
};

const STEPS: Step[] = [
  { title: 'Fetch and merge origin/main' },
  { title: 'Resolve conflicts and check markers' },
  { title: 'Drop the Listbox workaround main now fixes', outcome: 'failed' },
  { title: 'Build, typecheck and test the spike' },
  { title: 'Check the call log rows in the story' },
  { title: 'Format, commit and push' },
];

/** Where the run leaves the task at `index` when it is working on the task at `active`. */
const statusAt = (step: Step, index: number, active: number): Task.Status =>
  index < active ? (step.outcome ?? 'done') : index === active ? 'started' : 'todo';

type StoryArgs = {
  steps: Step[];
  /** Index of the task being worked on: those before it have ended, those after have not started. */
  active: number;
  /** Milliseconds each task is worked on before the run moves to the next; `0` holds the run at `active`. */
  interval: number;
  monochrome?: boolean;
};

/**
 * Tasks made from `steps`, then run in order by writing each task's status: the run starts at `active`, moves on every
 * `interval`, rests with every task ended, then starts again from the first.
 */
const DefaultStory = ({ steps, active: initialActive, interval, monochrome }: StoryArgs) => {
  const [tasks] = useState(() =>
    steps.map((step, index) => Task.make({ title: step.title, status: statusAt(step, index, initialActive) })),
  );
  useEffect(() => {
    if (interval <= 0) {
      return;
    }
    let active = initialActive;
    const timer = setInterval(() => {
      active = active >= steps.length ? 0 : active + 1;
      tasks.forEach((task, index) => {
        const status = statusAt(steps[index], index, active);
        if (task.status !== status) {
          // Written directly, not through `Task.setStatus`: a run that loops would grow each task's history for ever.
          Obj.update(task, (task) => {
            task.status = status;
          });
        }
      });
    }, interval);
    return () => clearInterval(timer);
  }, [tasks, steps, initialActive, interval]);

  return <TaskProgress tasks={tasks} monochrome={monochrome} />;
};

const meta = {
  title: 'ui/react-ui-task/TaskProgress',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ classNames: 'p-0 w-[32rem]' })],
  args: { steps: STEPS, active: 3, interval: 1_500 },
  parameters: { layout: 'centered', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The run moves through the tasks; it opens with a task done, failed, started and not started. */
export const Default: Story = {};

/** `monochrome`: the icons take the text colours, so their shapes tell the statuses apart. */
export const Monochrome: Story = {
  args: { monochrome: true },
};

/** The run held at the fourth task. */
export const Paused: Story = {
  args: { interval: 0 },
};

/** Every task status, in the row state it draws as. */
export const Statuses: Story = {
  args: {
    interval: 0,
    active: Task.StatusOptions.length,
    steps: Task.StatusOptions.map(({ id, title }) => ({ title, outcome: id })),
  },
};

/**
 * A row per task, named by the task's own status. `done` draws as success, `failed` as failed, `started` as working
 * (the one icon that spins, and the one title at full emphasis) and `todo` as not started.
 */
export const Test: Story = {
  args: { interval: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = within(canvas.getByRole('list', { name: 'Tasks' })).getAllByRole('listitem');
    await expect(rows).toHaveLength(STEPS.length);
    await expect(rows.map((row) => row.dataset.taskStatus)).toEqual([
      'done',
      'done',
      'failed',
      'started',
      'todo',
      'todo',
    ]);
    await expect(rows.map((row) => row.dataset.status)).toEqual([
      'success',
      'success',
      'failed',
      'working',
      'not-started',
      'not-started',
    ]);
    await expect(within(rows[2]).getByRole('img')).toHaveAccessibleName('Failed');
    await expect(within(rows[3]).getByRole('img')).toHaveAccessibleName('Started');
    // The working icon is still for a reader who prefers reduced motion.
    const spin = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'dx-spin';
    await expect(getComputedStyle(within(rows[3]).getByRole('img')).animationName).toBe(spin);
    await expect(rows[3]).toHaveTextContent(STEPS[3].title);
  },
};
