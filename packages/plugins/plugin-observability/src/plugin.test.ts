//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { ObservabilityPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

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
