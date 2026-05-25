//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SpotlightPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SpotlightPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [SpotlightPlugin()],
    });

    // State, SpotlightDismiss, and ReactRoot all activate on Startup.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('State'), moduleId('SpotlightDismiss'), moduleId('ReactRoot')]),
    );

    // OperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
