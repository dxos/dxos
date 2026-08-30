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

    // `Chat.tasks` is a `SetParent` field, so delegation MOVES the task: it now follows the chat's
    // lifecycle rather than the set it came from.
    expect(Obj.getParent(task)?.id).toBe(chat.id);
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
