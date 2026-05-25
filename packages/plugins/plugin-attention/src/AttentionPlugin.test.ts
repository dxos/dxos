//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { GraphPlugin } from '@dxos/plugin-graph/plugin';

import { AttentionPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('AttentionPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createTestApp({
      plugins: [GraphPlugin(), ProcessManagerPlugin(), AttentionPlugin()],
    });

    // Modules expected to be active after a normal startup.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('attention'), moduleId('ReactContext'), moduleId('Keyboard')]),
    );

    // OperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
