//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import * as GraphPlugin from '@dxos/plugin-graph/GraphPlugin';

import { meta } from '#meta';
import { SettingsPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('SettingsPlugin', () => {
  test('modules activate on startup', async ({ expect }) => {
    // Use createTestApp directly to avoid a circular dep with plugin-testing.
    // All plugin-settings modules are dependency-mode and activate during the startup
    // dependency pass, regardless of the legacy Setup*/Ready event waves.
    await using harness = await createTestApp({
      plugins: [GraphPlugin.make(), ProcessManagerPlugin(), SettingsPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('SettingsAppGraphBuilder'), moduleId('OperationHandler')]),
    );
    // ReactSurface is role-gated (SurfacesRequested) and parks until its role renders.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
  });
});
