//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { SpotlightPlugin } from './SpotlightPlugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SpotlightPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [SpotlightPlugin()],
    });

    // Operation handlers are not loaded on startup — SetupOperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
