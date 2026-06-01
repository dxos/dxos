//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { IntegrationPlugin } from '@dxos/plugin-integration/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { GitHubPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('GitHubPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), IntegrationPlugin(), GitHubPlugin()],
    });

    // After autoStart: SetupAppGraph fires (cascading SetupIntegrationProviders via
    // IntegrationPlugin's AppGraphBuilder), and SetupProcessManager fires from
    // ProcessManagerPlugin — both reach the GitHubPlugin's modules.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('GitHubIntegrationProvider'), moduleId('OperationHandler')]),
    );
  }, 30_000);
});
