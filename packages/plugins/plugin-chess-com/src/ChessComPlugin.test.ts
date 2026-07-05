//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { ChessPlugin } from '@dxos/plugin-chess/plugin';
import { GamePlugin } from '@dxos/plugin-game/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ChessComPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ChessComPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), GamePlugin(), ChessPlugin(), ChessComPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));

    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
