//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { IllustratorPlugin } from '@dxos/plugin-illustrator/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ExcalidrawPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ExcalidrawPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), IllustratorPlugin(), ExcalidrawPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('sketch-variant'), moduleId('schema'), moduleId('ReactSurface')]),
    );
  });
});
