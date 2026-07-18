//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ScriptPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ScriptPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), ScriptPlugin()],
    });

    // After autoStart: AppGraphBuilder, CreateObject, schema all auto-cascade. SkillDefinition is a
    // dependency-mode root, so it activates immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('AppGraphBuilder'),
        moduleId('CreateObject'),
        moduleId('schema'),
        moduleId('SkillDefinition'),
      ]),
    );
  });
});
