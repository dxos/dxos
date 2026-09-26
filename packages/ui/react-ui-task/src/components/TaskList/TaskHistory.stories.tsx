//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

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
 * options. The open one is asked first, so it is not the newest entry — it has to be found where it
 * happened rather than at the top.
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

const DefaultStory = ({ seed = seedTask, answerable = true }: { seed?: () => Task.Task; answerable?: boolean }) => {
  const [task] = useState(seed);
  const [history] = useObject(task, 'history');
  // Stands in for the `AnswerQuestion` operation: the answer lands in the log.
  const handleAnswer = useCallback(
    (questionId: string, answer: string) => {
      Task.answer(task, questionId, answer, { actor: user });
    },
    [task],
  );

  return (
    <Column.Root gutter='md' classNames='w-[32rem] py-2'>
      <TaskHistory entries={history ?? []} limit={10} onAnswer={answerable ? handleAnswer : undefined} />
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
 * Questions sit in the log where they were asked — not in a section of their own — each one an entry
 * of its own with its options as separate items, and the open one is answered in place.
 */
export const TestQuestionsInline: Story = {
  play: async ({ canvasElement }) => {
    const items = () =>
      [...canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.history"] > [role="listitem"]')].map(
        (item) =>
          item.querySelector('[data-testid="task-question"]')?.getAttribute('aria-label') ??
          item.textContent?.trim() ??
          '',
      );

    await waitFor(() => expect(items().length).toBeGreaterThan(0), { timeout: 10_000 });
    // Newest first, with each question at its own position and its answer inside it rather than as
    // an entry of its own.
    const order = items();
    const toneIndex = order.indexOf('Formal or friendly tone?');
    const refundIndex = order.indexOf('What is our refund window for annual plans?');
    await expect(toneIndex).toBeGreaterThan(0);
    await expect(refundIndex).toBeGreaterThan(toneIndex);
    await expect(order).toHaveLength(4);

    const refund = () =>
      canvasElement.querySelector<HTMLElement>('[data-testid="task-question"][aria-label^="What is our refund"]');
    const tone = canvasElement.querySelector<HTMLElement>('[data-testid="task-question"][aria-label^="Formal"]');
    await expect(tone?.querySelector('[data-testid="task-question.answer"]')).toHaveTextContent('Friendly');
    await expect(tone?.querySelector('[data-testid="task-question.option"]')).toBeNull();

    // One item per option, each on its own.
    const options = refund()?.querySelectorAll<HTMLElement>('[role="list"] > [role="listitem"]') ?? [];
    await expect(options).toHaveLength(3);
    for (const option of options) {
      await expect(option.querySelectorAll('[data-testid="task-question.option"]')).toHaveLength(1);
    }

    await userEvent.click(options[1].querySelector<HTMLElement>('[data-testid="task-question.option"]')!);
    await waitFor(
      () => expect(refund()?.querySelector('[data-testid="task-question.answer"]')).toHaveTextContent('60 days'),
      { timeout: 10_000 },
    );
    // Answered, it stays where it was asked; the answer does not become an entry of its own.
    await expect(items()).toHaveLength(4);
  },
};

/** Without an answer handler the open question is shown, but offers nothing to click. */
export const Readonly: Story = {
  args: { answerable: false },
};
