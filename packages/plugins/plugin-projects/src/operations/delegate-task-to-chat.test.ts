//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Task } from '@dxos/types';

import { ProjectsPlugin } from '#plugin';
import { ProjectOperation } from '#types';

describe('ProjectOperation.DelegateTaskToChat', () => {
  test('opens a chat carrying the task in its checklist', async ({ expect }) => {
    await using harness = await setup();
    const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
    invariant(space, 'Expected a default space.');

    const task = space.db.add(Task.make({ title: 'Ship the release', status: 'todo' }));
    await space.db.flush();

    const { chat } = await harness.runPromise(
      Operation.invoke(ProjectOperation.DelegateTaskToChat, { tasks: [Ref.make(task)] }, { spaceId: space.id }),
    );

    // The chat is named for the task, so the conversation is findable by what it is about.
    expect(chat.name).toBe('Ship the release');

    const [ref] = chat.tasks;
    invariant(ref, 'Expected the task in the chat checklist.');
    expect(Task.refEntityId(ref)).toBe(task.id);

    // The checklist is a plain ref array, so delegation does not claim ownership of the task: an
    // unparented one stays unparented.
    expect(Obj.getParent(task)).toBeUndefined();
  });

  test('files the chat under the task project, marks it started, and names a reviewer', async ({ expect }) => {
    await using harness = await setup();
    const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
    invariant(space, 'Expected a default space.');

    // A project owning a task set owning the task — the shape the row action runs against.
    const { project } = await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Voyage' }, { spaceId: space.id }),
    );
    const taskSet = await project.taskSet?.tryLoad();
    invariant(taskSet, 'Expected the scaffolded task set.');
    const task = space.db.add(Task.make({ title: 'Write a poem', status: 'todo' }));
    Obj.setParent(task, taskSet);
    await space.db.flush();

    const { chat } = await harness.runPromise(
      Operation.invoke(ProjectOperation.DelegateTaskToChat, { tasks: [Ref.make(task)] }, { spaceId: space.id }),
    );

    // Filed under the project, so it reaches that project's navtree rather than the space root.
    expect(Obj.getParent(chat)?.id).toBe(project.id);

    // Still owned by the set it came from — the chat works on the task, it does not take it. An
    // owning checklist would re-parent it and drop it out of the project's task list.
    expect(Obj.getParent(task)?.id).toBe(taskSet.id);

    // Started on delegation, not on completion: the row shows work is underway from the moment the
    // session has it.
    expect(task.status).toBe('started');

    // The delegating identity reviews the result, which is what will send the task to `review`
    // rather than `done` when the work finishes.
    expect(task.reviewers).toHaveLength(1);
  });

  test('puts a whole checked set into one chat, in the order given', async ({ expect }) => {
    await using harness = await setup();
    const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
    invariant(space, 'Expected a default space.');

    const titles = ['Source green coffee', 'Finalize roast curve', 'Design label'];
    const tasks = titles.map((title) => space.db.add(Task.make({ title, status: 'todo' })));
    await space.db.flush();

    const { chat } = await harness.runPromise(
      Operation.invoke(
        ProjectOperation.DelegateTaskToChat,
        { tasks: [Ref.make(tasks[2]), Ref.make(tasks[0])] },
        { spaceId: space.id },
      ),
    );

    // One chat for the whole selection, holding the tasks in the order the caller listed them —
    // which is the order the list showed them, not the order they were ticked.
    expect(chat.tasks.map((ref) => Task.refEntityId(ref))).toEqual([tasks[2].id, tasks[0].id]);

    // Unnamed: a chat holding several tasks would be claiming to be about whichever came first.
    expect(chat.name).toBeUndefined();

    // Every delegated task is underway, and the one left unchecked is untouched.
    expect(tasks.map((task) => task.status)).toEqual(['started', 'todo', 'started']);
  });

  test('refuses a list spanning two projects', async ({ expect }) => {
    await using harness = await setup();
    const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
    invariant(space, 'Expected a default space.');

    // One chat is filed under one project and told to file its output there, so a list drawn from
    // two has no answer. Unreachable from the UI — a checked set comes from a single list — but the
    // operation is a skill verb an agent calls with any refs.
    const taskIn = async (name: string, title: string) => {
      const { project } = await harness.runPromise(
        Operation.invoke(ProjectOperation.Create, { name }, { spaceId: space.id }),
      );
      const taskSet = await project.taskSet?.tryLoad();
      invariant(taskSet, 'Expected the scaffolded task set.');
      const task = space.db.add(Task.make({ title, status: 'todo' }));
      Obj.setParent(task, taskSet);
      return task;
    };

    const voyage = await taskIn('Voyage', 'Write a poem');
    const harbour = await taskIn('Harbour', 'Draw a map');
    await space.db.flush();

    await expect(
      harness.runPromise(
        Operation.invoke(
          ProjectOperation.DelegateTaskToChat,
          { tasks: [Ref.make(voyage), Ref.make(harbour)] },
          { spaceId: space.id },
        ),
      ),
    ).rejects.toThrow();

    // Nothing was started: the refusal happens before any task is marked or any chat exists.
    expect([voyage.status, harbour.status]).toEqual(['todo', 'todo']);
  });
});

const setup = async () => {
  const harness = await createComposerTestApp({
    // Tasks is declared in Projects' `dependsOn`; Assistant supplies the `CreateChat` handler.
    plugins: [
      ClientPlugin.make({}),
      SpacePlugin.make({}),
      TasksPlugin.make(),
      AssistantPlugin.make(),
      ProjectsPlugin(),
    ],
  });
  const client = harness.get(ClientCapabilities.Client);
  await EffectEx.runAndForwardErrors(initializeIdentity(client));
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return harness;
};
