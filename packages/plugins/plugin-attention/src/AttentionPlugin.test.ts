//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { GraphPlugin } from '@dxos/plugin-graph';

import { AttentionPlugin } from './AttentionPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('AttentionPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createTestApp({
      plugins: [GraphPlugin(), OperationPlugin(), RuntimePlugin(), AttentionPlugin()],
    });

    // attention + ReactContext activate on Startup.
    // Keyboard activates on allOf(AppGraphReady, AttentionReady) — both fire during startup
    // because GraphPlugin fires AppGraphReady and the attention module fires AttentionReady.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('attention'), moduleId('ReactContext'), moduleId('Keyboard')]),
    );

    // OperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
