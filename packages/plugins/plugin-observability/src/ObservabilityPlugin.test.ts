//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ObservabilityPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('ObservabilityPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      // TODO(wittjosiah): Align browser and node variant option types.
      plugins: [ObservabilityPlugin({} as any)],
    });

    // OperationHandler fires automatically (ProcessManagerPlugin fires SetupProcessManager during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
