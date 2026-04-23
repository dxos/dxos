//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { FilesPlugin } from './FilesPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('FilesPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [FilesPlugin()],
      // SetupSettings must fire before SetupReactSurface because ReactSurface eagerly reads FileCapabilities.Settings.
      setupEvents: [AppActivationEvents.SetupSettings],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('ReactSurface')]),
    );

    // Operation handlers are not loaded on startup — SetupOperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
