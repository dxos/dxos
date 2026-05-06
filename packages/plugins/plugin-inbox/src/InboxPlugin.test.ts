//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { InboxPlugin } from './index';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('InboxPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [InboxPlugin()],
    });

    // metadata activates on SetupMetadata (fired by GraphPlugin during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('metadata'));

    // OperationHandler fires automatically (OperationPlugin fires SetupOperationHandler during Startup).
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));

    // schema activates on SetupSchema — fired explicitly here (normally fired by ClientPlugin).
    await harness.fire(AppActivationEvents.SetupSchema);
    expect(harness.manager.getActive()).toContain(moduleId('schema'));
  });
});
