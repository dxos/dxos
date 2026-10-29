//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Harness from '@dxos/plugin-testing/Harness';

import * as ObservabilityPlugin from '#meta';

import { ObservabilityNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ObservabilityPlugin.make({} as any)] });

const moduleId = (name: string) => `${ObservabilityNamespace.key}.module.${name}`;

describe('ObservabilityPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      // TODO(wittjosiah): Align browser and node variant option types.
      plugins: [ObservabilityPlugin.make({} as any)],
    });

    // OperationHandler fires automatically (ProcessManagerPlugin fires SetupProcessManager during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
