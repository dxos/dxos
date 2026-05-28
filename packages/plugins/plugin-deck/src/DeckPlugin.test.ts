//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DeckPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('DeckPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [DeckPlugin()],
    });

    expect(harness.manager.getActive()).toContain(moduleId('AppGraphBuilder'));

    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
