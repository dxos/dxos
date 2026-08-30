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
      Operation.invoke(ProjectOperation.DelegateTaskToChat, { task: Ref.make(task) }, { spaceId: space.id }),
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
      Operation.invoke(ProjectOperation.DelegateTaskToChat, { task: Ref.make(task) }, { spaceId: space.id }),
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
