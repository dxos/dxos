//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// Use the CLI variant — the main ClientPlugin references capabilities that resolve to undefined under Node.
import { ClientPlugin } from '@dxos/plugin-client';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { InboxPlugin } from './index';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('InboxPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Startup cascades: GraphPlugin fires SetupAppGraph + SetupMetadata; ClientPlugin fires SetupSchema.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), InboxPlugin()],
    });

    // metadata activates on SetupMetadata (fired by GraphPlugin during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('metadata'));

    // OperationHandler fires automatically (OperationPlugin fires SetupOperationHandler during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));

    // schema activates on SetupSchema — cascades automatically from Startup via ClientPlugin.
    expect(harness.manager.getActive()).toContain(moduleId('schema'));
  });
});
