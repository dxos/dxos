//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as ScriptPlugin from '#meta';

import { ScriptNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), ScriptPlugin.make()] });

const moduleId = (name: string) => `${ScriptNamespace.key}.module.${name}`;

describe('ScriptPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), ScriptPlugin.make()],
    });

    // After autoStart: AppGraphBuilder, CreateObject, schema all auto-cascade. SkillDefinition is a
    // dependency-mode root, so it activates immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('schema')]),
    );
  });
});
