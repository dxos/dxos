//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as RegistryPlugin from '#meta';
import { RegistryOperation } from '#operations';

import { RegistryNamespace } from '../namespace.ts';

await Harness.preload({ plugins: [RegistryPlugin.make()] });

describe('RegistryOperation.QueryPlugins', () => {
  test('lists the installed plugins on both axes', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [RegistryPlugin.make()] });

    const { plugins } = await harness.runPromise(Operation.invoke(RegistryOperation.QueryPlugins, {}));

    const registry = plugins.find((plugin) => plugin.id === RegistryNamespace.key);
    expect(registry).toMatchObject({ enabled: true, active: true });
    // Wiring is not the caller's business: a plugin is addressed by id.
    expect(registry).not.toHaveProperty('moduleIds');
  });

  test('filters to the enabled set', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [RegistryPlugin.make()] });

    const { plugins } = await harness.runPromise(Operation.invoke(RegistryOperation.QueryPlugins, { enabled: true }));

    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins.every((plugin) => plugin.enabled)).toBe(true);
  });
});
