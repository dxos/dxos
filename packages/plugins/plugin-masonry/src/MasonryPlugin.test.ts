//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { MasonryPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('MasonryPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), MasonryPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('CreateObject'), moduleId('schema'), moduleId('ReactSurface')]),
    );
  });
});
