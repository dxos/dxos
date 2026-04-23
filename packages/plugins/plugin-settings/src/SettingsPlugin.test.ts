//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { GraphPlugin } from '@dxos/plugin-graph';

import { SettingsPlugin } from './SettingsPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SettingsPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createTestApp({
      plugins: [GraphPlugin(), OperationPlugin(), RuntimePlugin(), SettingsPlugin()],
    });

    expect(harness.manager.getActive()).toContain(moduleId('SettingsAppGraphBuilder'));

    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
