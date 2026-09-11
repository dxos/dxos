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
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Task } from '@dxos/types';

import { ProjectsPlugin } from '#plugin';
import { ProjectOperation } from '#types';

describe('ProjectOperation.CopyTaskPrompt', () => {
  test('renders the task, its addresses and the project it belongs to', async ({ expect }) => {
    await using harness = await setup();
    const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
    invariant(space, 'Expected a default space.');

    const { project } = await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Voyage' }, { spaceId: space.id }),
    );
    const taskSet = await project.taskSet?.tryLoad();
    invariant(taskSet, 'Expected the scaffolded task set.');
    const task = space.db.add(
      Task.make({ [Obj.Parent]: taskSet, title: 'Write a poem', description: 'In iambic pentameter.', status: 'todo' }),
    );
    await space.db.flush();

    const { prompt } = await harness.runPromise(
      Operation.invoke(ProjectOperation.CopyTaskPrompt, { task: Ref.make(task) }, { spaceId: space.id }),
    );

    expect(prompt).toContain('Write a poem');
    expect(prompt).toContain('In iambic pentameter.');

    // The addresses are the point: a pasted prompt is only a handoff if the agent can reach the
    // live objects from it.
    expect(prompt).toContain(Obj.getURI(task));
    expect(prompt).toContain(Obj.getURI(taskSet));
    expect(prompt).toContain(Obj.getURI(project));
    expect(prompt).toContain(space.id);

    // The project is the context the work happens in, so the prompt names it.
    expect(prompt).toContain('Voyage');

    // Claiming the task is what makes the external handoff visible on the row.
    expect(prompt).toContain('org.dxos.operation.tasks.update');
    expect(prompt).toContain('"started"');

    // One call: `remoteSession` resolves or creates the run's session record and assigns the task
    // to it, so the work is recorded against this run rather than against "an assistant".
    expect(prompt).toContain('remoteSession');
    expect(prompt).toContain('sessionId');
  });

  test('renders a task outside any project', async ({ expect }) => {
    await using harness = await setup();
    const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
    invariant(space, 'Expected a default space.');

    const task = space.db.add(Task.make({ title: 'Buy coffee', status: 'todo' }));
    await space.db.flush();

    const { prompt } = await harness.runPromise(
      Operation.invoke(ProjectOperation.CopyTaskPrompt, { task: Ref.make(task) }, { spaceId: space.id }),
    );

    // A loose task still makes a usable prompt — the project sections are simply absent.
    expect(prompt).toContain('Buy coffee');
    expect(prompt).toContain(Obj.getURI(task));
    expect(prompt).not.toContain('## Project');
  });
});

const setup = async () => {
  const harness = await createComposerTestApp({
    plugins: [
      ClientPlugin.make({}),
      SpacePlugin.make({}),
      TasksPlugin.make(),
      AssistantPlugin.make(),
      RoutinePlugin.make(),
      ProjectsPlugin(),
    ],
  });
  const client = harness.get(ClientCapabilities.Client);
  await EffectEx.runAndForwardErrors(initializeIdentity(client));
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return harness;
};
