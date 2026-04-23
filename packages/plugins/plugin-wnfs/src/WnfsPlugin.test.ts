//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { WnfsPlugin } from './WnfsPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('WnfsPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart + ClientPlugin: ClientPlugin fires ClientReady, which triggers the blockstore module
    // that tries to open filesystem paths and fails in the test environment.
    // Fire only the safe events needed to verify metadata, schema, and operation handler modules.
    await using harness = await createComposerTestApp({
      plugins: [WnfsPlugin()],
      autoStart: false,
    });

    await harness.fire(AppActivationEvents.SetupMetadata);
    await harness.fire(AppActivationEvents.SetupSchema);

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('metadata'), moduleId('schema')]),
    );

    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
