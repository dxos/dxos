//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ScriptedScene } from '@dxos/ai/testing';
import * as DelegationSkill from '@dxos/assistant-toolkit/DelegationSkill';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as Agent from '@dxos/compute/Agent';
import { type Database, Filter, Obj } from '@dxos/echo';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { Task } from '@dxos/types';

import { ChatColumns, type ChatColumnsProps, ProjectPanel } from '../../components/index.ts';
import { LAUNCH_REQUEST, LAUNCH_TASKS, Scripts, SESSIONS_STARTED, SIDE_QUESTION } from '../../scripts/index.ts';
import { createDecorators, launchProjectPlugins, seedLaunchProject, storyParameters } from '../../testing/index.ts';

/**
 * Subagents as sessions: the agent hands each of its project's tasks to a new chat with an agent process of its own,
 * rather than to a light thread inside its conversation. The project is on the left: its task list on top, and a
 * mosaic of the documents the sessions write beneath it. Every chat in the space is a column to its right, so each
 * session opens beside the agent's chat as it starts, writes its document there, and ticks its task off. There is no
 * waiting: the agent's turn ends once the sessions are started, and the task list reports their progress.
 *
 * Compare `threads/Delegation`, which plays the same launch kit on light threads.
 */
const meta: Meta<ChatColumnsProps> = {
  title: 'stories/stories-assistant/sessions/Delegation',
  component: ChatColumns,
  render: (args) => (
    <div className='flex dx-fill min-h-0'>
      <ProjectPanel />
      <div className='flex-1 min-w-0 h-full'>
        <ChatColumns {...args} />
      </div>
    </div>
  ),
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<ChatColumnsProps>;

/** Waits until the agent's chat and exactly `sessions` delegated sessions show as columns. */
const waitForSessions = (canvasElement: HTMLElement, sessions: number, timeout: number) =>
  waitFor(() => expect(canvasElement.querySelectorAll('[data-testid="chat-plane.column"]').length).toBe(1 + sessions), {
    timeout,
  });

// Captured when the chat is created, so the play can check who each task was delegated to rather than read it off the page.
let storyDb: Database.Database | undefined;

/** Each launch task's delegate: the session it was handed to, which holds the task on its own checklist. */
const expectDelegatedToSessions = async () => {
  const db = storyDb;
  await expect(db).toBeDefined();
  const tasks = db ? await db.query(Filter.type(Task.Task)).run() : [];
  const sessions = new Set<string>();
  for (const { title } of LAUNCH_TASKS) {
    const task = tasks.find((candidate) => candidate.title === title);
    await expect(task, title).toBeDefined();
    const subject = await task?.delegate?.subject?.load();
    await expect(subject && Obj.instanceOf(Agent.Session, subject), title).toBe(true);
    if (task && subject && Obj.instanceOf(Agent.Session, subject)) {
      await expect(subject.tasks.map((ref) => Task.refEntityId(ref))).toContain(task.id);
      sessions.add(subject.id);
    }
  }
  await expect(sessions.size).toBe(LAUNCH_TASKS.length);
};

const launchKit: Story = {
  decorators: createDecorators({
    onChatCreated: async ({ db, chat }) => {
      storyDb = db;
      await seedLaunchProject({ db, chat });
    },
    lazyPlugins: launchProjectPlugins,
    skills: [MarkdownSkill.key, PlanningSkill.key, DelegationSkill.key],
    // Every model call, not only the chat's: the planning skill checks an unfinished checklist on a model of its own
    // when the agent's turn ends with its sessions still working, and that check must not reach the network.
    scripted: ScriptedScene.play(Scripts.launchKitSessions),
    assistantSettings: { parallelThreads: true },
  }),
  args: {
    suggestions: [LAUNCH_REQUEST, SIDE_QUESTION],
    // From the left, so the agent's chat sits beside the project panel and sessions open to its right.
    align: 'start',
    // Open from the start, so the agent's checklist is seen ticking off as sessions finish.
    defaultDrawer: 'tasks',
  },
};

/**
 * Launch kit on sessions, scripted (offline), for a person or a recorded walkthrough to drive.
 *
 * Test:
 * 1. Look left: the project's task list holds the four launch tasks.
 * 2. Click the chip that asks for the Composer 1.0 launch kit: a column opens beside the agent's chat for each session
 *    the agent starts, named after its task, and its task shows as started.
 * 3. Scroll the strip sideways to reach the columns past the edge: each session writes its document in its own chat,
 *    and the document appears as a card under the project's task list.
 * 4. Click the chip that asks which day to launch: the agent answers while the sessions keep working.
 * 5. Wait: each session ticks its task off once its document is written.
 */
export const LaunchKit: Story = { ...launchKit };

/** {@link LaunchKit} driven by a play function: four sessions start, write their documents and tick their tasks off. */
export const LaunchKitScripted: Story = {
  ...launchKit,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: LAUNCH_REQUEST }, { timeout: 60_000 }));

    // A column per session opens beside the agent's chat, and the agent's turn ends once all are started.
    await waitForSessions(canvasElement, LAUNCH_TASKS.length, 60_000);
    await canvas.findAllByText(new RegExp(SESSIONS_STARTED), {}, { timeout: 30_000 });

    // The reader keeps talking while the sessions work.
    await userEvent.click(await canvas.findByRole('button', { name: SIDE_QUESTION }, { timeout: 30_000 }));
    await canvas.findAllByText(/Tuesday the 18th/, {}, { timeout: 30_000 });

    // Every session writes its document in its own column and ticks its task off.
    for (const { document } of LAUNCH_TASKS) {
      // Matched on the whole paragraph, since the document's name is set in bold inside it.
      await canvas.findAllByText(
        (_content, element) => element?.textContent === `Wrote ${document}.`,
        {},
        { timeout: 120_000 },
      );
    }
    // The agent's checklist, in the first column, shows every task done.
    await waitFor(
      () => {
        const [agentColumn] = canvasElement.querySelectorAll('[data-testid="chat-plane.column"]');
        const statuses = [...agentColumn.querySelectorAll('[data-testid="taskList.item.status"]')].map((status) =>
          status.textContent?.trim(),
        );
        return expect(statuses).toEqual(LAUNCH_TASKS.map(() => 'Done'));
      },
      { timeout: 30_000 },
    );

    // Each task was handed to a session of its own, which is now the task's delegate.
    await expectDelegatedToSessions();

    // The project panel shows each document the sessions wrote as a card.
    await waitFor(
      () =>
        expect(canvasElement.querySelectorAll('[data-testid="project-panel.artifact"]').length).toBe(
          LAUNCH_TASKS.length,
        ),
      { timeout: 30_000 },
    );
  },
};
