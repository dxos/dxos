//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as MapPlugin from '#meta';

import { MapNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), MapPlugin.make()] });

const moduleId = (name: string) => `${MapNamespace.key}.module.${name}`;

describe('MapPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), MapPlugin.make()],
    });

    // OperationHandler is a dependency-mode root, so it activates immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
