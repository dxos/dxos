//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { GraphPlugin } from '@dxos/plugin-graph/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { RegistryOperation } from '#operations';
import { RegistryPlugin } from '#plugin';

const graphKey = GraphPlugin.make().meta.profile.key;

describe('RegistryOperation.EnablePlugins', () => {
  test('enables an installed but disabled plugin', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [RegistryPlugin(), GraphPlugin.make()],
      enabled: [meta.profile.key],
    });

    const { enabled, rejected } = await harness.runPromise(
      Operation.invoke(RegistryOperation.EnablePlugins, { ids: [graphKey] }),
    );

    expect(enabled).toContain(graphKey);
    expect(rejected).toEqual([]);
  });

  test('reports dependencies that came on with the requested plugin', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [RegistryPlugin(), GraphPlugin.make()],
      enabled: [meta.profile.key],
    });

    const dependencies = harness.manager.getDependencies(graphKey, { transitive: true });
    const { enabled } = await harness.runPromise(
      Operation.invoke(RegistryOperation.EnablePlugins, { ids: [graphKey] }),
    );

    // Enabling one plugin enables its closure; the reply names everything that came on, not just
    // what was asked for.
    for (const id of dependencies.filter((id) => id !== meta.profile.key)) {
      expect(enabled).toContain(id);
    }
    expect(new Set(enabled).size).toBe(enabled.length);
  });

  test('rejects a plugin the host does not have installed', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [RegistryPlugin()] });

    const { enabled, rejected } = await harness.runPromise(
      Operation.invoke(RegistryOperation.EnablePlugins, { ids: ['org.dxos.plugin.nonexistent'] }),
    );

    expect(enabled).toEqual([]);
    expect(rejected).toMatchObject([{ id: 'org.dxos.plugin.nonexistent' }]);
  });

  test('an already-enabled plugin is not a failure', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [RegistryPlugin()] });

    const { enabled, rejected } = await harness.runPromise(
      Operation.invoke(RegistryOperation.EnablePlugins, { ids: [meta.profile.key] }),
    );

    expect(enabled).toEqual([meta.profile.key]);
    expect(rejected).toEqual([]);
  });
});
