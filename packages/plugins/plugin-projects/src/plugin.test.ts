//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Project from '@dxos/compute/Project';
import { Type } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { ProjectsPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ProjectsPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      // Tasks is declared in `dependsOn`, so the manager refuses to resolve Projects without it.
      plugins: [ClientPlugin.make({}), TasksPlugin.make(), ProjectsPlugin()],
    });

    // OperationHandler is a dependency-mode root, so it activates immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler'), moduleId('Templates')]),
    );

    // Rendering is unavailable in a node host, so the React surfaces must stay out of the variant.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
    expect(harness.manager.getActive()).not.toContain(moduleId('AppGraphBuilder'));

    // Demand-gated on the assistant's start event, so it must stay off the startup pass.
    expect(harness.manager.getActive()).not.toContain(moduleId('SkillDefinition'));
  });

  test('the project skill activates when the assistant starts', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      // Tasks is declared in `dependsOn`, so the manager refuses to resolve Projects without it.
      plugins: [ClientPlugin.make({}), TasksPlugin.make(), ProjectsPlugin()],
    });

    await harness.fire(AppActivationEvents.AssistantStart);
    expect(harness.manager.getActive()).toContain(moduleId('SkillDefinition'));
    expect(harness.getAll(AppCapabilities.SkillDefinition).length).toBeGreaterThan(0);
  });

  test('registers the project types with the client', async ({ expect }) => {
    // Without a registered `Project` type every project verb fails where it stores the object.
    await using harness = await createComposerTestApp({
      // Tasks is declared in `dependsOn`, so the manager refuses to resolve Projects without it.
      plugins: [ClientPlugin.make({}), TasksPlugin.make(), ProjectsPlugin()],
    });

    const client = harness.get(ClientCapabilities.Client);
    await client.waitUntilInitialized();
    await harness.waitForCapability(ClientCapabilities.SchemaRegistered);
    expect(client.graph.registry.getByURI(String(Type.getURI(Project.Project)))).toBeDefined();
  });
});
