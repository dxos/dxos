//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
// #plugin resolves to ClientPlugin.node.ts under the source condition used by vitest.
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('ClientPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({})],
    });

    // The CLI variant activates Client and SchemaDefs on startup.
    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('Client'), moduleId('SchemaDefs')]));

    // Operation handlers are not loaded on startup — SetupProcessManager fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
