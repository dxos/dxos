//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Type } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';
import { Task, TaskMigration, TaskSet } from '@dxos/types';

import * as TasksPlugin from '#meta';

import { TasksNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), TasksPlugin.make()] });

const moduleId = (name: string) => `${TasksNamespace.key}.module.${name}`;

describe('TasksPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), TasksPlugin.make()],
    });

    // OperationHandler is a dependency-mode root, so it activates immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );

    // Rendering is unavailable in a node host, so the React surfaces must stay out of the variant.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
    expect(harness.manager.getActive()).not.toContain(moduleId('AppGraphBuilder'));
  });

  test('contributes the task hierarchy migrations', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), TasksPlugin.make()],
    });

    await harness.waitForCapability(ClientCapabilities.Migration);
    expect(harness.getAll(ClientCapabilities.Migration).flat()).toEqual(
      expect.arrayContaining(TaskMigration.migrations),
    );
  });

  test('registers the task types with the client', async ({ expect }) => {
    // Without these registered, every task verb fails where it stores the object.
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), TasksPlugin.make()],
    });

    const client = harness.get(ClientCapabilities.Client);
    await client.waitUntilInitialized();
    await harness.waitForCapability(ClientCapabilities.SchemaRegistered);
    for (const type of [Task.Task, TaskSet.TaskSet]) {
      expect(client.graph.registry.getByURI(String(Type.getURI(type))), Type.getTypename(type)).toBeDefined();
    }
  });
});
