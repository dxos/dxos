//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { BoardPlugin } from './BoardPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('BoardPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), BoardPlugin()],
    });

    // Modules expected to be active after a normal startup.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('metadata'), moduleId('schema'), moduleId('ReactSurface')]),
    );
  });
});
