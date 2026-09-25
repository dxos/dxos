//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ChessPlugin from '@dxos/plugin-chess/ChessPlugin';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as GamePlugin from '@dxos/plugin-game/GamePlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { ChessComPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ChessComPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), GamePlugin.make(), ChessPlugin.make(), ChessComPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
