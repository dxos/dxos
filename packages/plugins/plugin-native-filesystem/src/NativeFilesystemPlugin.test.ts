//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { NativeFilesystemPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('NativeFilesystemPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [NativeFilesystemPlugin()],
    });

    // AppGraphBuilder and ReactSurface require StateReady (gated on ClientReady) and won't activate in headless tests.
    // OperationHandler activates at startup when ProcessManagerPlugin fires SetupProcessManager.
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
