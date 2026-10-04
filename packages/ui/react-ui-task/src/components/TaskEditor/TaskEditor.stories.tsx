//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';

import { translations } from '#translations';

import { TaskEditor } from './TaskEditor.tsx';

type DefaultStoryProps = {
  seed: () => Task.Task;
  showDescription?: boolean;
  readonly?: boolean;
};

/** A task's fields, edited in place: each commit writes through `Task.update`, and the snapshot below follows it. */
const DefaultStory = ({ seed, showDescription, readonly }: DefaultStoryProps) => {
  const [task] = useState(seed);
  const [, setVersion] = useState(0);
  const handleUpdate = useCallback((task: Task.Task, patch: Task.Edit) => {
    Task.update(task, patch);
    setVersion((version) => version + 1);
  }, []);

  return <TaskEditor task={task} showDescription={showDescription} onUpdate={readonly ? undefined : handleUpdate} />;
};

const meta = {
  title: 'ui/react-ui-task/TaskEditor',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    seed: () =>
      Task.make({
        title: 'Source green coffee',
        description: 'Order **two sacks** from the usual importer; check the moisture reading on arrival.',
      }),
    showDescription: true,
  },
};

/** Title only: the description field is off by default. */
export const TitleOnly: Story = {
  args: {
    seed: () => Task.make({ title: 'Finalize roast curve' }),
  },
};

/** Without `onUpdate` the fields are read-only. */
export const Readonly: Story = {
  args: {
    seed: () => Task.make({ title: 'Print run v1', description: 'Waiting on the label proof.' }),
    showDescription: true,
    readonly: true,
  },
};

/**
 * 1. Rename the task: Enter commits the title.
 * 2. The field keeps the new title.
 */
export const TestRename: Story = {
  args: {
    seed: () => Task.make({ title: 'Draft launch email' }),
  },
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector<HTMLInputElement>('[data-testid="taskEditor.title"]');
    if (!title) {
      throw new Error('Title field not found.');
    }
    await userEvent.clear(title);
    await userEvent.type(title, 'Draft the launch email{Enter}');
    await waitFor(() => expect(title).toHaveValue('Draft the launch email'));
  },
};
