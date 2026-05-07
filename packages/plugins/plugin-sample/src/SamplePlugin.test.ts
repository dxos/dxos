//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { SamplePlugin } from '#plugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SamplePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Startup cascades: GraphPlugin fires SetupAppGraph + SetupMetadata; ClientPlugin fires SetupSchema.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), SamplePlugin()],
    });

    // metadata activates on SetupMetadata (fired by GraphPlugin during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('metadata'));

    // OperationHandler fires automatically (OperationPlugin fires SetupOperationHandler during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));

    // schema activates on SetupSchema — cascades automatically from Startup via ClientPlugin.
    expect(harness.manager.getActive()).toContain(moduleId('schema'));
  });
});
