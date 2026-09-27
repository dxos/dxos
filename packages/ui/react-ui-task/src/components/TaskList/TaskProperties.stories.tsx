//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Obj, Ref } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Actor, RemoteSession, Task } from '@dxos/types';

import { translations } from '#translations';

import { TaskList } from './TaskList.tsx';
import { TaskProperties } from './TaskProperties.tsx';

const SESSION_TITLE = 'Show agent assignees by session name';

/** A coding agent's actor: an assistant standing for its harness session rather than a person. */
const makeAgent = (): Actor.Actor => {
  const session = RemoteSession.make({
    sessionId: 'session_015UUwMUhDAcqtrhGysm53Yu',
    title: SESSION_TITLE,
    state: 'running',
    started: new Date().toISOString(),
    repo: 'dxos/dxos',
    branch: 'claude/task-agent-assignee',
  });
  return { role: 'assistant', subject: Ref.make(session) };
};

/**
 * A task's properties beside the list row it came from, so the pill and the property row can be read
 * against each other — they name the same assignee and must agree.
 */
const DefaultStory = ({ seed }: { seed: () => Task.Task }) => {
  const [task] = useState(seed);
  const [, setVersion] = useState(0);
  const handleUpdate = useCallback((task: Task.Task, patch: Task.Edit) => {
    Obj.update(task, (task) => {
      Object.assign(task, patch);
    });
    setVersion((version) => version + 1);
  }, []);

  return (
    <div className='flex flex-col gap-4 p-2 w-[32rem]'>
      <div data-testid='story.list'>
        <TaskList.Root tasks={[task]} showGroupLabels={false} onTaskUpdate={handleUpdate}>
          <TaskList.Viewport>
            <TaskList.Content />
          </TaskList.Viewport>
        </TaskList.Root>
      </div>
      <TaskProperties task={task} onTaskUpdate={handleUpdate} />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-task/TaskProperties',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    seed: () => Task.make({ title: 'Source green coffee', status: 'started', priority: 'high' }),
  },
};

/**
 * A task a coding agent has picked up: the assignee is its session, so both the pill and the property
 * row name the session and carry the harness's mark — never a bare "Agent" — and the picker lists the
 * agent as the checked entry, so the reader can see who holds the task before switching it away.
 */
export const TestAgentAssignee: Story = {
  args: {
    seed: () =>
      Task.make({ title: 'Fix the assignee label', status: 'started', priority: 'medium', assignee: makeAgent() }),
  },
  play: async ({ canvasElement }) => {
    const property = () => canvasElement.querySelector<HTMLElement>('[data-testid="taskList.property.assignee"]');
    await waitFor(() => expect(property()).toHaveTextContent(SESSION_TITLE), { timeout: 10_000 });
    await expect(property()).not.toHaveTextContent('Agent');
    await expect(property()?.querySelector('svg use')?.getAttribute('href')).toContain('anthropic');

    const chip = () => canvasElement.querySelector<HTMLElement>('[data-testid="taskList.item.assignee"]');
    await waitFor(() => expect(chip()).toHaveTextContent(SESSION_TITLE), { timeout: 10_000 });

    const trigger = property();
    if (!trigger) {
      throw new Error('The assignee property did not render.');
    }
    await userEvent.click(trigger);
    const agentItem = () => document.querySelector<HTMLElement>('[data-testid="taskList.assignee.current"]');
    await waitFor(() => expect(agentItem()).toBeTruthy(), { timeout: 10_000 });
    await expect(agentItem()).toHaveAttribute('aria-checked', 'true');
    await expect(agentItem()).toHaveTextContent(SESSION_TITLE);
  },
};
