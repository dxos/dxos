//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as SidekickPlugin from '#meta';

import { SidekickNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), SidekickPlugin.make()] });

const moduleId = (name: string) => `${SidekickNamespace.key}.module.${name}`;

describe('SidekickPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), SidekickPlugin.make()],
    });

    // SkillDefinition is a dependency-mode root, so it activates immediately too.
    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));
  });
});
