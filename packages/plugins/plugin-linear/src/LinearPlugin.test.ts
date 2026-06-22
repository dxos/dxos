//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { ConnectorPlugin } from '@dxos/plugin-connector/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { LinearPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('LinearPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), ConnectorPlugin(), LinearPlugin()],
    });

    // After autoStart: SetupAppGraph fires (cascading SetupIntegrationProviders via
    // ConnectorPlugin's AppGraphBuilder), and SetupProcessManager fires from
    // ProcessManagerPlugin — both reach the LinearPlugin's modules.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('LinearIntegrationProvider'), moduleId('OperationHandler')]),
    );
  }, 30_000);
});
