//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Type } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { TasksPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('TasksPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), TasksPlugin()],
    });

    // The headless/node variant, which is what `#plugin` resolves to here. OperationHandler is a
    // dependency-mode root, so it activates immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );

    // Rendering is unavailable in a node host, so the React surfaces must stay out of the variant.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
    expect(harness.manager.getActive()).not.toContain(moduleId('AppGraphBuilder'));
  });

  test('registers the task types with the client', async ({ expect }) => {
    // A headless host registers nothing on its own, so the plugin owns every type its operations
    // write — without them the task verbs fail at the point they store the object.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), TasksPlugin()],
    });

    const client = harness.get(ClientCapabilities.Client);
    await client.waitUntilInitialized();
    await harness.waitForCapability(ClientCapabilities.SchemaRegistered);
    for (const type of [Task.Task, TaskSet.TaskSet]) {
      expect(client.graph.registry.getByURI(String(Type.getURI(type))), Type.getTypename(type)).toBeDefined();
    }
  });
});
