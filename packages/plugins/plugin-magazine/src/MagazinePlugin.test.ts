//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { MagazinePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('MagazinePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), MagazinePlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('AppGraphBuilder'),
        moduleId('CreateObject'),
        moduleId('schema'),
        moduleId('ReactSurface'),
      ]),
    );

    // Operation handlers are not loaded on startup — SetupProcessManager fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
