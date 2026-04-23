//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DeckPlugin } from './DeckPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('DeckPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [DeckPlugin()],
    });

    // Modules expected to be active after a normal startup.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('ReactSurface'), moduleId('ReactRoot')]),
    );

    // Operation handlers are not loaded on startup — SetupOperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
