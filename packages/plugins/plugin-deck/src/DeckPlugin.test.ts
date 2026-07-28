//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DeckPlugin } from './DeckPlugin.workerd';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('DeckPlugin (workerd)', () => {
  test('the DOM-free variant activates its operation handler', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [DeckPlugin()],
    });

    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
