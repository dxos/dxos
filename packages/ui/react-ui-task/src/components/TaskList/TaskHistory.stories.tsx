//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, waitFor } from 'storybook/test';

import { useObject } from '@dxos/echo-react';
import { Column } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';

import { translations } from '#translations';

import { TaskHistory } from './TaskHistory.tsx';

const agent = { role: 'assistant' as const, name: 'Scout' };
const user = { role: 'user' as const, name: 'Rich' };

/** Minutes before now, so the log reads oldest to newest in the order it is written here. */
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/**
 * A task whose log interleaves changes with two questions: one answered, one still open with
 * options — which the log leaves to the task's open questions.
 */
const seedTask = (): Task.Task => {
  const task = Task.make({ title: 'Draft the refund reply', status: 'started', assignee: agent });
  Task.ask(task, {
    text: 'What is our refund window for annual plans?',
    context: 'The order is 45 days old and nothing in the project states the policy.',
    options: [
      { title: '30 days', description: 'The standard terms on the pricing page.' },
      { title: '60 days', description: 'The enterprise terms, if this customer is on them.' },
      { title: 'No refund' },
    ],
    actor: agent,
    date: minutesAgo(40),
  });
  Task.setStatus(task, 'blocked', { actor: agent, date: minutesAgo(35) });
  const tone = Task.ask(task, {
    text: 'Formal or friendly tone?',
    options: [{ title: 'Formal' }, { title: 'Friendly' }],
    actor: agent,
    date: minutesAgo(30),
  });
  Task.answer(task, tone.id, 'Friendly', { actor: user, date: minutesAgo(20) });
  Task.update(task, { priority: 'high' }, { actor: user, date: minutesAgo(10) });
  return task;
};

const DefaultStory = ({ seed = seedTask }: { seed?: () => Task.Task }) => {
  const [task] = useState(seed);
  const [history] = useObject(task, 'history');

  return (
    <Column.Root gutter='md' classNames='w-[32rem] py-2'>
      <TaskHistory entries={history ?? []} limit={10} />
    </Column.Root>
  );
};

const meta = {
  title: 'ui/react-ui-task/TaskHistory',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * An answered question is one entry — the question with its answer under it — dated when it was
 * answered; an open question is not in the log, since it is waiting on the reader rather than a
 * record of what happened.
 */
export const TestQuestionsInActivity: Story = {
  play: async ({ canvasElement }) => {
    const items = () => [
      ...canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.history"] > [role="listitem"]'),
    ];

    await waitFor(() => expect(items().length).toBeGreaterThan(0), { timeout: 10_000 });
    const texts = items().map((item) => item.textContent ?? '');

    // The exchange is one item, at the time it was answered: after the priority change, before the block.
    const exchange = texts.findIndex((text) => text.includes('Formal or friendly tone?'));
    await expect(exchange).toBe(1);
    await expect(items()[exchange].querySelector('[data-testid="taskList.history.answer"]')).toHaveTextContent(
      'Friendly',
    );
    // The answer is not repeated as an entry of its own, and the open question is not in the log.
    await expect(texts.filter((text) => text.includes('Friendly'))).toHaveLength(1);
    await expect(texts.some((text) => text.includes('refund window'))).toBe(false);
  },
};
