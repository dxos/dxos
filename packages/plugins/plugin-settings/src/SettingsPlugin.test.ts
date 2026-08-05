//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { GraphPlugin } from '@dxos/plugin-graph/plugin';

import { SettingsPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('SettingsPlugin', () => {
  test('modules activate on startup', async ({ expect }) => {
    // Use createTestApp directly to avoid a circular dep with plugin-testing.
    // All plugin-settings modules are dependency-mode and activate during the startup
    // dependency pass, regardless of the legacy Setup*/Ready event waves.
    await using harness = await createTestApp({
      plugins: [GraphPlugin(), ProcessManagerPlugin(), SettingsPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('SettingsAppGraphBuilder'),
        moduleId('OperationHandler'),
        moduleId('ReactSurface'),
      ]),
    );
  });
});
