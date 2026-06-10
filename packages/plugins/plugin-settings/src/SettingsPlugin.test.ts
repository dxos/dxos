//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { GraphPlugin } from '@dxos/plugin-graph/plugin';

import { SettingsPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SettingsPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly to avoid a circular dep with plugin-testing.
    // GraphPlugin fires SetupAppGraph (via firesBeforeActivation) during Startup.
    // SettingsAppGraphBuilder activates on allOf(SetupSettings, SetupAppGraph),
    // so SetupSettings must be fired as a setup event.
    // ProcessManagerPlugin fires SetupProcessManager during Startup, activating OperationHandler.
    await using harness = await createTestApp({
      plugins: [GraphPlugin(), ProcessManagerPlugin(), SettingsPlugin()],
      setupEvents: [AppActivationEvents.SetupSettings],
    });

    // SettingsAppGraphBuilder activates on allOf(SetupSettings, SetupAppGraph).
    // OperationHandler activates on SetupProcessManager (fired by ProcessManagerPlugin during Startup).
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('SettingsAppGraphBuilder'), moduleId('OperationHandler')]),
    );
  });
});
