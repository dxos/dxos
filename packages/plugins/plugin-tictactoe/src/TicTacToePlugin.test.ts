//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { GamePlugin } from '@dxos/plugin-game/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { TicTacToePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('TicTacToePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), GamePlugin(), TicTacToePlugin()],
    });

    // Modules expected to be active after a normal startup. OperationHandler is a dependency-mode
    // root, so it activates immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('GameVariant'), moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
