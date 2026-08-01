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
  // Boot imports start-gated module bodies (the harness fires the plugin's start event), which
  // can exceed the default 15s under vite-node transform load.
  test('modules activate on the expected events', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), IllustratorPlugin(), ExcalidrawPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('drawing-variant'), moduleId('schema')]),
    );
  });
});
