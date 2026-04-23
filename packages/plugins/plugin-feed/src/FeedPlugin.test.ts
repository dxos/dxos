//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { FeedPlugin } from './FeedPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('FeedPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), FeedPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('AppGraphBuilder'),
        moduleId('metadata'),
        moduleId('schema'),
        moduleId('ReactSurface'),
      ]),
    );

    // Operation handlers are not loaded on startup — SetupOperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
