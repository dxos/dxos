//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { RegistryPlugin } from './RegistryPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('RegistryPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [RegistryPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('ReactSurface')]),
    );

    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
