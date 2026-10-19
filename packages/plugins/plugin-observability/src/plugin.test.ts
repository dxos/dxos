//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Harness from '@dxos/plugin-testing/Harness';

import { meta } from '#meta';
import { ObservabilityPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ObservabilityPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      // TODO(wittjosiah): Align browser and node variant option types.
      plugins: [ObservabilityPlugin({} as any)],
    });

    // OperationHandler fires automatically (ProcessManagerPlugin fires SetupProcessManager during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
