//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ObservabilityPlugin } from '#plugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('ObservabilityPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ObservabilityPlugin()],
    });

    // OperationHandler fires automatically (OperationPlugin fires SetupOperationHandler during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
