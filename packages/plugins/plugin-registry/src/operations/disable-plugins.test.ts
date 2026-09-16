//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import { GraphPlugin } from '@dxos/plugin-graph/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { RegistryOperation } from '#operations';
import { RegistryPlugin } from '#plugin';

const graphKey = GraphPlugin.make().meta.profile.key;

describe('RegistryOperation.DisablePlugins', () => {
  test('disables an enabled plugin', async ({ expect }) => {
    const key = 'org.dxos.plugin.testTarget';
    await using harness = await createComposerTestApp({ plugins: [RegistryPlugin(), makePlugin(key)] });

    const { disabled, rejected } = await harness.runPromise(
      Operation.invoke(RegistryOperation.DisablePlugins, { ids: [key] }),
    );

    expect(disabled).toContain(key);
    expect(rejected).toEqual([]);
    expect(harness.manager.getEnabled()).not.toContain(key);
  });

  test('reports enabled dependents that went off with the requested plugin', async ({ expect }) => {
    const dependencyKey = 'org.dxos.plugin.testDependency';
    const dependentKey = 'org.dxos.plugin.testDependent';
    await using harness = await createComposerTestApp({
      plugins: [RegistryPlugin(), makePlugin(dependencyKey), makePlugin(dependentKey, [dependencyKey])],
    });

    const { disabled, rejected } = await harness.runPromise(
      Operation.invoke(RegistryOperation.DisablePlugins, { ids: [dependencyKey] }),
    );

    // Disabling a plugin tears down its enabled dependents; the reply names everything that went
    // off, not just what was asked for.
    expect(disabled).toContain(dependencyKey);
    expect(disabled).toContain(dependentKey);
    expect(rejected).toEqual([]);
    expect(harness.manager.getEnabled()).not.toContain(dependentKey);
  });

  test('rejects a core plugin and leaves it enabled', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [RegistryPlugin()] });

    const { disabled, rejected } = await harness.runPromise(
      Operation.invoke(RegistryOperation.DisablePlugins, { ids: [graphKey] }),
    );

    expect(disabled).toEqual([]);
    expect(rejected).toMatchObject([{ id: graphKey }]);
    expect(harness.manager.getEnabled()).toContain(graphKey);
  });

  test('rejects a plugin the host does not have installed', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [RegistryPlugin()] });

    const { disabled, rejected } = await harness.runPromise(
      Operation.invoke(RegistryOperation.DisablePlugins, { ids: ['org.dxos.plugin.nonexistent'] }),
    );

    expect(disabled).toEqual([]);
    expect(rejected).toMatchObject([{ id: 'org.dxos.plugin.nonexistent' }]);
  });

  test('an already-disabled plugin is not a failure', async ({ expect }) => {
    const key = 'org.dxos.plugin.testTarget';
    await using harness = await createComposerTestApp({ plugins: [RegistryPlugin(), makePlugin(key)], enabled: [] });

    const { disabled, rejected } = await harness.runPromise(
      Operation.invoke(RegistryOperation.DisablePlugins, { ids: [key] }),
    );

    expect(disabled).toEqual([key]);
    expect(rejected).toEqual([]);
  });
});

const makePlugin = (key: string, dependsOn?: string[]) =>
  Plugin.make(Plugin.define({ profile: { key, name: key, dependsOn } }))();
