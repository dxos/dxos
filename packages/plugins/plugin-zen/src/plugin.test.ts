//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as ZenPlugin from '#meta';

import { ZenNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), ZenPlugin.make()] });

const moduleId = (name: string) => `${ZenNamespace.key}.module.${name}`;

describe('ZenPlugin', () => {
  test('modules activate on the expected events', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), ZenPlugin.make()],
    });

    // Modules expected to be active after a normal startup.
    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));
  });
});
