//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { GraphPlugin } from '@dxos/plugin-graph';

import { meta } from './meta';
import { SettingsPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SettingsPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly to avoid a circular dep with plugin-testing.
    // GraphPlugin fires SetupAppGraph (via firesBeforeActivation) during Startup,
    // activating SettingsAppGraphBuilder. OperationPlugin fires SetupOperationHandler
    // during Startup, activating OperationHandler.
    await using harness = await createTestApp({
      plugins: [GraphPlugin(), OperationPlugin(), RuntimePlugin(), SettingsPlugin()],
    });

    // SettingsAppGraphBuilder activates on SetupAppGraph (fired by GraphPlugin during Startup).
    // OperationHandler activates on SetupOperationHandler (fired by OperationPlugin during Startup).
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('SettingsAppGraphBuilder'), moduleId('OperationHandler')]),
    );
  });
});
