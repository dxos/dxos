//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ObservabilityPlugin } from './ObservabilityPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('ObservabilityPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: ReactSurface imports atlaskit CSS which is CJS-only and fails in Node.
    // Fire only Startup to verify AppGraphBuilder and OperationHandler.
    await using harness = await createComposerTestApp({
      plugins: [
        ObservabilityPlugin({
          namespace: 'test',
          observability: async () => ({} as any),
        }),
      ],
      autoStart: false,
    });

    await harness.fire(AppActivationEvents.SetupAppGraph);

    expect(harness.manager.getActive()).toContain(moduleId('AppGraphBuilder'));
  });
});
