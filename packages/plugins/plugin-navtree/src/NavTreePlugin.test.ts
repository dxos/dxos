//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { NavTreePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('NavTreePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [NavTreePlugin()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('AppGraphBuilder')]));

    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
