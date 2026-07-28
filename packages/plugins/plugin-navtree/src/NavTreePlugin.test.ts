//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { NavTreePlugin } from './NavTreePlugin.workerd';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('NavTreePlugin (workerd)', () => {
  test('the DOM-free variant activates its operation handler', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [NavTreePlugin()],
    });

    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
