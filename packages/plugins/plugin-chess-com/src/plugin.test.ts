//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ChessPlugin from '@dxos/plugin-chess/ChessPlugin';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as GamePlugin from '@dxos/plugin-game/GamePlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as ChessComPlugin from '#meta';

import { ChessComNamespace } from './namespace.ts';

await Harness.preload({
  plugins: [ClientPlugin.make({}), GamePlugin.make(), ChessPlugin.make(), ChessComPlugin.make()],
});

const moduleId = (name: string) => `${ChessComNamespace.key}.module.${name}`;

describe('ChessComPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), GamePlugin.make(), ChessPlugin.make(), ChessComPlugin.make()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
