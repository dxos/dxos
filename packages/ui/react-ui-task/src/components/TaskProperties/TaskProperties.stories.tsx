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

import { type TaskMember, TaskProperties } from './TaskProperties.tsx';

const SESSION_TITLE = 'Show agent assignees by session name';

const AGENT_NAME = 'Claude Code';

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
const DefaultStory = ({ seed, members }: { seed: () => Task.Task; members?: TaskMember[] }) => {
  const [task] = useState(seed);
  const [, setVersion] = useState(0);
  const handleUpdate = useCallback((task: Task.Task, patch: Task.Edit) => {
    Obj.update(task, (task) => {
      Object.assign(task, patch);
    });
    setVersion((version) => version + 1);
  }, []);

  return <TaskProperties task={task} members={members} onTaskUpdate={handleUpdate} />;
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
 * row name the agent by its harness, not the session's title, and carry the harness's mark; the picker lists the
 * agent as the checked entry, so the reader can see who holds the task before switching it away.
 */
export const TestAgentAssignee: Story = {
  args: {
    seed: () =>
      Task.make({ title: 'Fix the assignee label', status: 'started', priority: 'medium', assignee: makeAgent() }),
  },
  play: async ({ canvasElement }) => {
    const property = () => canvasElement.querySelector<HTMLElement>('[data-testid="taskList.property.assignee"]');
    await waitFor(() => expect(property()).toHaveTextContent(AGENT_NAME), { timeout: 10_000 });
    await expect(property()).not.toHaveTextContent(SESSION_TITLE);
    // Awaited: the icon's `href` is set once the registry has fetched the glyph.
    await waitFor(() => expect(property()?.querySelector('svg use')?.getAttribute('href')).toContain('anthropic'));

    const trigger = property();
    if (!trigger) {
      throw new Error('The assignee property did not render.');
    }
    await userEvent.click(trigger);
    const agentItem = () => document.querySelector<HTMLElement>('[data-testid="taskList.assignee.current"]');
    await waitFor(() => expect(agentItem()).toBeTruthy(), { timeout: 10_000 });
    await expect(agentItem()).toHaveAttribute('aria-checked', 'true');
    await expect(agentItem()).toHaveTextContent(AGENT_NAME);
  },
};

/** The space's members, the owner among them, are offered by identity and assign the task by DID. */
export const TestMemberAssignee: Story = {
  args: {
    seed: () => Task.make({ title: 'Roast the first batch', status: 'todo' }),
    members: [
      { did: 'did:halo:owner', name: 'Rich' },
      { did: 'did:halo:member', name: 'Priya' },
    ],
  },
  play: async ({ canvasElement }) => {
    const property = () => canvasElement.querySelector<HTMLElement>('[data-testid="taskList.property.assignee"]');
    await waitFor(() => expect(property()).toBeTruthy(), { timeout: 10_000 });
    const trigger = property();
    if (!trigger) {
      throw new Error('The assignee property did not render.');
    }
    await userEvent.click(trigger);
    const items = () => [...document.querySelectorAll<HTMLElement>('[data-testid="taskList.assignee.member"]')];
    await waitFor(() => expect(items().map((item) => item.textContent)).toEqual(['Rich', 'Priya']), {
      timeout: 10_000,
    });

    const [, priya] = items();
    await userEvent.click(priya);
    await waitFor(() => expect(property()).toHaveTextContent('Priya'));
  },
};
