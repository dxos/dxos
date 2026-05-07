//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { ClientPlugin } from '@dxos/plugin-client';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { ScriptPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('ScriptPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), ScriptPlugin()],
    });

    // After autoStart: AppGraphBuilder, metadata, schema all auto-cascade.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('metadata'), moduleId('schema')]),
    );

    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));
  });
});
