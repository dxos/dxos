//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { RegistryOperation } from '#operations';
import { RegistryPlugin } from '#plugin';

describe('RegistryOperation.QueryPlugins', () => {
  test('lists the installed plugins on both axes', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [RegistryPlugin()] });

    const { plugins } = await harness.runPromise(Operation.invoke(RegistryOperation.QueryPlugins, {}));

    const registry = plugins.find((plugin) => plugin.id === meta.profile.key);
    expect(registry).toMatchObject({ enabled: true, active: true });
    // Wiring is not the caller's business: a plugin is addressed by id.
    expect(registry).not.toHaveProperty('moduleIds');
  });

  test('filters to the enabled set', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [RegistryPlugin()] });

    const { plugins } = await harness.runPromise(Operation.invoke(RegistryOperation.QueryPlugins, { enabled: true }));

    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins.every((plugin) => plugin.enabled)).toBe(true);
  });
});
