//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { AGENT_PROCESS_KEY } from '@dxos/agent-runtime';
import { Model } from '@dxos/ai';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { AiContext } from '@dxos/assistant';
import { ProcessManager } from '@dxos/compute-runtime';
import * as AgentService from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Skill from '@dxos/compute/Skill';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
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
    const task = space.db.add(Task.make({ [Obj.Parent]: taskSet, title: 'Write a poem', status: 'todo' }));
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
    // session has it, and the chat's agent is who holds it.
    expect(task.status).toBe('started');
    expect(task.assignee?.role).toBe('assistant');
    // Held by that chat, named as the assignee's subject: a bare assistant role is the supervisor's
    // spawn request, whose orphan sweep would fail a started task no sub-agent is running.
    expect(Task.refEntityId(task.assignee?.subject)).toBe(chat.id);

    // The delegating identity reviews the result, which is what will send the task to `review`
    // rather than `done` when the work finishes.
    expect(task.reviewers).toHaveLength(1);
  });

  test('binds the skills the project instructions name, alongside the delegation set', async ({ expect }) => {
    await using harness = await setup();
    const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
    invariant(space, 'Expected a default space.');

    const { project } = await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Studio' }, { spaceId: space.id }),
    );
    const instructions = await project.instructions?.tryLoad();
    const taskSet = await project.taskSet?.tryLoad();
    invariant(instructions && taskSet, 'Expected the scaffolded instructions and task set.');
    // A template's skill: the project's tools for the work, which the delegation set cannot know.
    const studioSkill = Skill.registryURI('org.dxos.skill.studio');
    Obj.update(instructions, (instructions) => {
      instructions.skills.push(Ref.fromURI(studioSkill));
    });
    const task = space.db.add(Task.make({ [Obj.Parent]: taskSet, title: 'Make a storyboard', status: 'todo' }));
    await space.db.flush();

    const { chat } = await harness.runPromise(
      Operation.invoke(ProjectOperation.DelegateTaskToChat, { tasks: [Ref.make(task)] }, { spaceId: space.id }),
    );

    const feed = await chat.feed.load();
    const bindings = await space.db.query(Query.select(Filter.type(AiContext.Binding)).from(feed)).run();
    const bound = bindings.flatMap((binding) => binding.skills.added.map((ref) => ref.uri));
    expect(bound).toContain(studioSkill);
    // The delegation set still comes along, and the shared project skill is bound once.
    expect(bound).toContain(Skill.registryURI('org.dxos.skill.planning'));
    expect(bound.filter((uri) => uri === Skill.registryURI('org.dxos.skill.project'))).toHaveLength(1);
  });

  test('keeps the delegated session when the companion binds the project to the chat', async ({ expect }) => {
    await using harness = await setup();
    const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
    invariant(space, 'Expected a default space.');

    const { project } = await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Voyage' }, { spaceId: space.id }),
    );
    const taskSet = await project.taskSet?.tryLoad();
    invariant(project.instructions && taskSet, 'Expected the scaffolded instructions and task set.');
    const task = space.db.add(Task.make({ [Obj.Parent]: taskSet, title: 'Write a poem', status: 'todo' }));
    await space.db.flush();

    const { chat } = await harness.runPromise(
      Operation.invoke(ProjectOperation.DelegateTaskToChat, { tasks: [Ref.make(task)] }, { spaceId: space.id }),
    );

    // Spawned with the project's instructions, as the companion binding would set them.
    expect(chat.instructions?.uri).toBe(project.instructions.uri);

    // The provider `RunPromptInChat` resolved for the chat's model: asking with any other is itself a
    // reconfiguration, which would tear down the delegated process before the companion gets to.
    const model = chat.model && DXN.tryMake(chat.model.uri);
    invariant(model, 'Expected the delegation to stamp a model on the chat.');
    const provider = Model.byId(model)[0]?.provider;
    const services = ServiceResolver.provide(
      { space: space.id },
      AgentService.AgentService,
      Database.Service,
      ProcessManager.Service,
    );
    const getSession = AgentService.getSession(chat, { provider, location: 'local' }).pipe(Effect.provide(services));
    await harness.runPromise(getSession);
    // Held rather than re-listed afterwards: the manager stops listing a process once it is terminated.
    const delegated = await harness.runPromise(
      Effect.flatMap(ProcessManager.Service, (manager) => manager.list({ key: AGENT_PROCESS_KEY })).pipe(
        Effect.provide(services),
      ),
    );
    expect(delegated.length).toBeGreaterThan(0);

    // What showing the Assistant companion does before its processor attaches to the session: a
    // configuration change here terminated the delegated process mid-turn, discarding its prompt.
    await harness.runPromise(
      Operation.invoke(AssistantOperation.BindChatContext, { chat, subject: project }, { spaceId: space.id }),
    );
    await harness.runPromise(getSession);

    // Asserted on the terminate rather than on session identity: the delegated turn may end by
    // itself (this harness has no model to answer it), which also replaces the session.
    expect(delegated.map((agent) => agent.status.state)).not.toContain(Process.State.TERMINATED);
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

    // Every delegated task is underway and assigned to the agent; the one left unchecked is untouched.
    expect(tasks.map((task) => task.status)).toEqual(['started', 'todo', 'started']);
    expect(tasks.map((task) => task.assignee?.role)).toEqual(['assistant', undefined, 'assistant']);
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
      const task = space.db.add(Task.make({ [Obj.Parent]: taskSet, title, status: 'todo' }));
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

  test('skips a task the agent already holds, and refuses a list of nothing else', async ({ expect }) => {
    await using harness = await setup();
    const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
    invariant(space, 'Expected a default space.');

    const held = space.db.add(
      Task.make({ title: 'Roast the beans', status: 'started', assignee: { role: 'assistant' } }),
    );
    const fresh = space.db.add(Task.make({ title: 'Grind the beans', status: 'todo' }));
    await space.db.flush();

    // A second invocation over a row already underway must not fork it into another session.
    const { chat } = await harness.runPromise(
      Operation.invoke(
        ProjectOperation.DelegateTaskToChat,
        { tasks: [Ref.make(held), Ref.make(fresh)] },
        { spaceId: space.id },
      ),
    );
    expect(chat.tasks.map((ref) => Task.refEntityId(ref))).toEqual([fresh.id]);
    expect(fresh.status).toBe('started');

    // Now both are held, so the same call has nothing to hand over.
    await expect(
      harness.runPromise(
        Operation.invoke(
          ProjectOperation.DelegateTaskToChat,
          { tasks: [Ref.make(held), Ref.make(fresh)] },
          { spaceId: space.id },
        ),
      ),
    ).rejects.toThrow();
  });
});

const setup = async () => {
  const harness = await createComposerTestApp({
    // Tasks is declared in Projects' `dependsOn`; Assistant supplies the `CreateChat` handler.
    // Routine is what provides `RemoteProcessManager`, which Assistant's `AgentService` spec
    // requires — without it that spec is pruned and every delegation fails to resolve `AgentService`.
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
  await harness.waitForEvent(ClientEvents.SpacesAvailable);
  return harness;
};
