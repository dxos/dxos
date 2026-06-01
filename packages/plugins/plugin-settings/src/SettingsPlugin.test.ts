//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { GraphPlugin } from '@dxos/plugin-graph/plugin';

import { SettingsPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SettingsPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly to avoid a circular dep with plugin-testing.
    // GraphPlugin fires SetupAppGraph (via firesBeforeActivation) during Startup,
    // activating SettingsAppGraphBuilder. ProcessManagerPlugin fires SetupProcessManager
    // during Startup, activating OperationHandler.
    await using harness = await createTestApp({
      plugins: [GraphPlugin(), ProcessManagerPlugin(), SettingsPlugin()],
    });

    // SettingsAppGraphBuilder activates on SetupAppGraph (fired by GraphPlugin during Startup).
    // OperationHandler activates on SetupProcessManager (fired by ProcessManagerPlugin during Startup).
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('SettingsAppGraphBuilder'), moduleId('OperationHandler')]),
    );
  });
});
