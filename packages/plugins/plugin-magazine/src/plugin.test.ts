//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as MagazinePlugin from '#meta';

import { MagazineNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), MagazinePlugin.make()] });

const moduleId = (name: string) => `${MagazineNamespace.key}.module.${name}`;

describe('MagazinePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), MagazinePlugin.make()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
    expect(harness.manager.getActive()).not.toContain(moduleId('AppGraphBuilder'));
  });
});
